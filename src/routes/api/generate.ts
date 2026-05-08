import { createFileRoute } from "@tanstack/react-router";
import { and, eq, gte, sql } from "drizzle-orm";

import { createGrsaiPredictions, createReplicatePredictions, generateText } from "@/lib/ai";
import { jsonResponse } from "@/lib/api-helpers";
import { createAuth } from "@/lib/auth/auth";
import { getCachedResult, setCachedResult } from "@/lib/cache/prompt-cache";
import { getD1Binding, getKvBinding } from "@/lib/cloudflare/bindings";
import { getDb } from "@/lib/db";
import { user as userTable } from "@/lib/db/schema/auth.schema";
import { generation, savedPrompt } from "@/lib/db/schema/data-flywheel.schema";
import { generateRequestSchema } from "@/lib/validation/schemas";

export const CREDIT_COST: Record<string, number> = {
  "z-image-fast": 10,
  "z-image-pro": 20,
  "z-text-fast": 5,
  "z-text-pro": 10,
  "z-video-fast": 40,
  "z-video-pro": 80,
};

export interface GenerateContext {
  request: Request;
  db: ReturnType<typeof getDb>;
  userId: string;
  stripeCustomerId?: string | null;
  replicateFn?: typeof createReplicatePredictions;
  grsaiFn?: typeof createGrsaiPredictions;
  textFn?: typeof generateText;
  getCachedFn?: typeof getCachedResult;
  setCachedFn?: typeof setCachedResult;
}

export async function handleGenerate(ctx: GenerateContext): Promise<Response> {
  const {
    request,
    db,
    userId,
    replicateFn = createReplicatePredictions,
    grsaiFn = createGrsaiPredictions,
    textFn = generateText,
    getCachedFn = getCachedResult,
    setCachedFn = setCachedResult,
  } = ctx;

  try {
    const raw = await request.json();
    const parsed = generateRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return jsonResponse({ error: "Invalid request", details: parsed.error.flatten() }, 400);
    }
    const body = parsed.data;

    const model = body.model;
    const n = body.n;
    const costPerUnit = CREDIT_COST[model] ?? 20;
    const maxCost = costPerUnit * n;
    const watermark = !ctx.stripeCustomerId;
    const template = body.promptTemplate || body.prompt;
    const variableGroups = body.variableGroups || [];

    // Check prompt cache first
    const cachedUrls = await getCachedFn(body.prompt, model, body.aspectRatio || "1:1", n);
    if (cachedUrls) {
      return jsonResponse(
        { urls: cachedUrls, creditsRemaining: null, cached: true, watermark },
        200,
      );
    }

    // Atomically check and deduct credits before generation
    const [deducted] = await db
      .update(userTable)
      .set({ credits: sql`${userTable.credits} - ${maxCost}` })
      .where(and(eq(userTable.id, userId), gte(userTable.credits, maxCost)))
      .returning({ credits: userTable.credits });

    if (!deducted) {
      return jsonResponse({ error: "Insufficient credits", required: maxCost }, 402);
    }

    // Text generation via DeepSeek (synchronous)
    if (model === "z-text-fast" || model === "z-text-pro") {
      try {
        const textModel = model === "z-text-pro" ? "deepseek-v4-pro" : "deepseek-v4-flash";
        const texts = await Promise.all(
          Array.from({ length: n }, () => textFn({ prompt: body.prompt, model: textModel })),
        );
        const newBalance = deducted.credits - maxCost;

        if (texts.length > 0) {
          await setCachedFn(body.prompt, model, body.aspectRatio || "1:1", texts.length, texts);
        }

        try {
          await db.insert(generation).values({
            id: crypto.randomUUID(),
            userId,
            promptTemplate: template,
            resolvedPrompts: JSON.stringify([body.prompt]),
            variableGroups: JSON.stringify(variableGroups),
            resultUrls: JSON.stringify(texts),
            model,
            creditsUsed: maxCost,
            createdAt: Math.floor(Date.now() / 1000),
          });
        } catch {
          // Generation history insert is non-fatal
        }

        // Auto-save prompt (dedup by template, not resolved prompt)
        try {
          const existing = await db
            .select({ id: savedPrompt.id })
            .from(savedPrompt)
            .where(and(eq(savedPrompt.userId, userId), eq(savedPrompt.promptTemplate, template)))
            .limit(1);
          if (existing.length === 0) {
            await db.insert(savedPrompt).values({
              id: crypto.randomUUID(),
              userId,
              name: template.slice(0, 40),
              promptTemplate: template,
              variableGroups: variableGroups.length > 0 ? JSON.stringify(variableGroups) : null,
              model,
              createdAt: Math.floor(Date.now() / 1000),
              updatedAt: Math.floor(Date.now() / 1000),
            });
          }
        } catch {
          /* non-fatal */
        }

        // Analytics (non-blocking)
        void (async () => {
          const { trackServer } = await import("@/lib/analytics/server");
          await trackServer("generation_completed", userId, {
            model,
            image_count: texts.length,
            credit_cost: maxCost,
          });
        })();

        return jsonResponse({ texts, creditsRemaining: newBalance, isText: true, watermark }, 200);
      } catch (err) {
        await db
          .update(userTable)
          .set({ credits: sql`${userTable.credits} + ${maxCost}` })
          .where(eq(userTable.id, userId));
        const message = err instanceof Error ? err.message : "Text generation failed";
        return jsonResponse({ error: message }, 500);
      }
    }

    // Image/Video generation (async via Replicate or GRS AI)
    let predictions: { id: string; status: string }[];
    let isVideo = false;

    try {
      if (model === "z-image-fast" || model === "z-video-fast" || model === "z-video-pro") {
        predictions = await replicateFn({
          prompt: body.prompt,
          aspectRatio: body.aspectRatio,
          n,
          model,
        });
        isVideo = model.startsWith("z-video");
      } else {
        // GRS AI async via webhook
        predictions = await grsaiFn({
          prompt: body.prompt,
          aspectRatio: body.aspectRatio,
          n,
          model: body.model,
        });

        // Store GRS task info in KV for webhook/poll to access
        const kv = getKvBinding();
        if (kv) {
          await Promise.all(
            predictions.map((p) =>
              kv.put(
                `grs:${p.id}`,
                JSON.stringify({
                  userId,
                  status: "processing",
                  prompt: body.prompt,
                  aspectRatio: body.aspectRatio,
                  createdAt: Date.now(),
                }),
                { expirationTtl: 3600 },
              ),
            ),
          );
        }
      }
    } catch (err) {
      // Refund credits on creation failure
      await db
        .update(userTable)
        .set({ credits: sql`${userTable.credits} + ${maxCost}` })
        .where(eq(userTable.id, userId));
      const message = err instanceof Error ? err.message : "Generation failed";
      return jsonResponse({ error: message }, 500);
    }

    const predictionIds = predictions.map((p) => p.id);
    const newBalance = deducted.credits;

    // Auto-save prompt (dedup by template, not resolved prompt)
    try {
      const existing = await db
        .select({ id: savedPrompt.id })
        .from(savedPrompt)
        .where(and(eq(savedPrompt.userId, userId), eq(savedPrompt.promptTemplate, template)))
        .limit(1);
      if (existing.length === 0) {
        await db.insert(savedPrompt).values({
          id: crypto.randomUUID(),
          userId,
          name: template.slice(0, 40),
          promptTemplate: template,
          variableGroups: variableGroups.length > 0 ? JSON.stringify(variableGroups) : null,
          model,
          createdAt: Math.floor(Date.now() / 1000),
          updatedAt: Math.floor(Date.now() / 1000),
        });
      }
    } catch {
      /* non-fatal */
    }

    try {
      await db.insert(generation).values({
        id: crypto.randomUUID(),
        userId,
        promptTemplate: template,
        resolvedPrompts: JSON.stringify([body.prompt]),
        variableGroups: JSON.stringify(variableGroups),
        resultUrls: JSON.stringify([]), // results arrive via polling/webhook
        model,
        creditsUsed: maxCost,
        createdAt: Math.floor(Date.now() / 1000),
      });
    } catch {
      // Generation history insert is non-fatal
    }

    // Analytics (non-blocking)
    void (async () => {
      const { trackServer } = await import("@/lib/analytics/server");
      await trackServer("generation_completed", userId, {
        model,
        image_count: predictionIds.length,
        credit_cost: maxCost,
        is_video: isVideo,
      });
    })();

    return jsonResponse(
      {
        predictionIds,
        status: "processing",
        async: true,
        creditsRemaining: newBalance,
        modelType: model === "z-image-fast" || model.startsWith("z-video") ? "replicate" : "grs",
        isVideo,
        watermark,
      },
      200,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
}

export const Route = createFileRoute("/api/generate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = createAuth();
        if (!auth) return dbUnavailable();

        const session = await auth.api.getSession({ headers: request.headers });

        // Guest generation: 2 free per day, IP-tracked, Image Turbo only
        if (!session?.user?.id) {
          const ip = request.headers.get("CF-Connecting-IP") || "unknown";
          const ua = request.headers.get("User-Agent") || "";
          const guestKey = `guest:${ip}:${ua.slice(0, 50)}`;
          const today = new Date().toISOString().slice(0, 10);
          const kvKey = `guest-gen:${guestKey}:${today}`;

          const kv = getKvBinding();
          let count = 0;
          if (kv) {
            const raw = await kv.get(kvKey);
            count = raw ? parseInt(raw, 10) : 0;
          }
          if (count >= 2) {
            return jsonResponse(
              {
                error:
                  "Guest limit reached. Sign up for 40 free credits and more daily generations!",
              },
              402,
            );
          }

          const raw = await request.json();
          if (!raw.prompt) return jsonResponse({ error: "Missing prompt" }, 400);
          if (raw.model && raw.model !== "z-image-fast") {
            return jsonResponse(
              { error: "Guest users can only use Image Turbo. Sign up for full access." },
              402,
            );
          }

          const guestPredictions = await createReplicatePredictions({
            prompt: raw.prompt,
            aspectRatio: raw.aspectRatio || "1:1",
            n: 1,
            model: "z-image-fast",
          });

          if (kv) {
            await kv.put(kvKey, String(count + 1), { expirationTtl: 86400 });
          }

          return jsonResponse(
            {
              predictionIds: guestPredictions.map((p) => p.id),
              status: "processing",
              async: true,
              creditsRemaining: null,
              modelType: "replicate",
              isVideo: false,
              watermark: true,
              guest: true,
            },
            200,
          );
        }

        const binding = getD1Binding();
        if (!binding) return dbUnavailable();

        const db = getDb(binding);
        const user = await db.query.user.findFirst({
          where: eq(userTable.id, session.user.id),
          columns: { stripeCustomerId: true },
        });

        return handleGenerate({
          request,
          db,
          userId: session.user.id,
          stripeCustomerId: user?.stripeCustomerId,
        });
      },
    },
  },
});

function dbUnavailable() {
  return jsonResponse({ error: "Database not available" }, 501);
}
