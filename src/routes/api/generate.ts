import { createFileRoute } from "@tanstack/react-router";
import { and, eq, gte, sql } from "drizzle-orm";

import { createGrsaiPredictions, createReplicatePredictions, generateText } from "@/lib/ai";
import {
  generateImageFallback,
  generateTextFallback,
  generateVideoFallback,
} from "@/lib/ai/fallback";
import {
  CONTENT_SAFETY_BLOCK_MESSAGE,
  filterSafeImageUrls,
  type NsfwDetector,
} from "@/lib/ai/nsfw";
import { jsonResponse, requireValidOrigin } from "@/lib/api-helpers";
import { createAuth } from "@/lib/auth/auth";
import { getCachedResult, setCachedResult } from "@/lib/cache/prompt-cache";
import { getD1Binding, getKvBinding } from "@/lib/cloudflare/bindings";
import { recordAiCreditSpend } from "@/lib/credits/audit";
import { getDb } from "@/lib/db";
import { user as userTable } from "@/lib/db/schema/auth.schema";
import { generation, savedPrompt } from "@/lib/db/schema/data-flywheel.schema";
import {
  calculateGenerationCredits,
  CREDIT_COST,
  DEFAULT_VIDEO_DURATION_SECONDS,
} from "@/lib/generator-credits";
import { checkRateLimit } from "@/lib/rate-limit";
import { generateRequestSchema } from "@/lib/validation/schemas";
export { CREDIT_COST };

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
  nsfwDetectorFn?: NsfwDetector;
}

type AiProvider = "deepseek" | "replicate" | "grsai" | "workers-ai";

async function auditAiSpend(input: {
  db: ReturnType<typeof getDb>;
  userId: string;
  credits: number;
  provider: AiProvider;
  model: string;
  apiCallCount: number;
  sourceId?: string | null;
  status?: "succeeded" | "failed" | "refunded";
  metadata?: Record<string, unknown>;
}) {
  try {
    await recordAiCreditSpend(input);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[credit-audit] Failed to record AI spend:", message);
  }
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
    nsfwDetectorFn,
  } = ctx;

  try {
    const raw = await request.json();
    const parsed = generateRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return jsonResponse({ error: "Invalid request", details: parsed.error.message }, 400);
    }
    const body = parsed.data;

    const model = body.model;
    const n = body.n;
    const durationSeconds = model.startsWith("z-video")
      ? (body.duration ?? DEFAULT_VIDEO_DURATION_SECONDS)
      : body.duration;
    const maxCost = calculateGenerationCredits({
      model,
      quantity: n,
      durationSeconds,
    });
    const watermark = !ctx.stripeCustomerId;
    const template = body.promptTemplate || body.prompt;
    const variableGroups = body.variableGroups || [];

    if (body.attachedUrls?.length) {
      const { blockedUrls } = await filterSafeImageUrls(body.attachedUrls, nsfwDetectorFn);
      if (blockedUrls.length > 0) {
        return jsonResponse({ error: CONTENT_SAFETY_BLOCK_MESSAGE }, 400);
      }
    }

    // Check prompt cache first
    const cachedUrls = await getCachedFn(
      body.prompt,
      model,
      body.aspectRatio || "1:1",
      n,
      durationSeconds,
      body.attachedUrls,
    );
    if (cachedUrls) {
      const { safeUrls } = await filterSafeImageUrls(cachedUrls, nsfwDetectorFn);
      if (safeUrls.length === 0) {
        return jsonResponse({ error: CONTENT_SAFETY_BLOCK_MESSAGE }, 400);
      }
      return jsonResponse({ urls: safeUrls, creditsRemaining: null, cached: true, watermark }, 200);
    }

    // Atomically check and deduct credits before generation
    const [deducted] = await db
      .update(userTable)
      .set({ credits: sql`${userTable.credits} - ${maxCost}` })
      .where(and(eq(userTable.id, userId), gte(userTable.credits, maxCost)))
      .returning({ credits: userTable.credits });

    if (!deducted) {
      const [currentUser] = await db
        .select({ credits: userTable.credits })
        .from(userTable)
        .where(eq(userTable.id, userId))
        .limit(1);
      return jsonResponse(
        { error: "Insufficient credits", required: maxCost, available: currentUser?.credits ?? 0 },
        402,
      );
    }

    // Text generation via DeepSeek (synchronous)
    if (model === "z-text-fast" || model === "z-text-pro") {
      try {
        const textModel = model === "z-text-pro" ? "deepseek-v4-pro" : "deepseek-v4-flash";
        const texts = await Promise.all(
          Array.from({ length: n }, () =>
            textFn({ prompt: body.prompt, model: textModel, maxTokens: body.maxTokens }),
          ),
        );
        const newBalance = deducted.credits;

        if (texts.length > 0) {
          await setCachedFn(
            body.prompt,
            model,
            body.aspectRatio || "1:1",
            texts.length,
            texts,
            durationSeconds,
            body.attachedUrls,
          );
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

        await auditAiSpend({
          db,
          userId,
          credits: maxCost,
          provider: "deepseek",
          model: textModel,
          apiCallCount: texts.length,
          status: "succeeded",
          metadata: { productModel: model },
        });

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
        console.warn("[generate] Text primary failed, trying Workers AI fallback:", err);
        try {
          const fallbackText = await generateTextFallback(body.prompt);
          if (fallbackText) {
            await auditAiSpend({
              db,
              userId,
              credits: maxCost,
              provider: "workers-ai",
              model: "text-fallback",
              apiCallCount: 1,
              status: "succeeded",
              metadata: { primaryProvider: "deepseek", productModel: model },
            });
            return jsonResponse(
              {
                texts: [fallbackText],
                creditsRemaining: deducted.credits,
                isText: true,
                watermark: true,
                fallback: true,
              },
              200,
            );
          }
        } catch (fbErr) {
          console.error("[generate] Workers AI fallback also failed:", fbErr);
        }
        const [refunded] = await db
          .update(userTable)
          .set({ credits: sql`${userTable.credits} + ${maxCost}` })
          .where(eq(userTable.id, userId))
          .returning({ credits: userTable.credits });
        const message = err instanceof Error ? err.message : "Text generation failed";
        await auditAiSpend({
          db,
          userId,
          credits: maxCost,
          provider: "deepseek",
          model,
          apiCallCount: n,
          status: "refunded",
          metadata: { error: message },
        });
        return jsonResponse(
          { error: message, creditsRemaining: refunded?.credits ?? deducted.credits + maxCost },
          500,
        );
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
          duration: body.duration,
          urls: body.attachedUrls?.length ? body.attachedUrls : undefined,
        });
        isVideo = model.startsWith("z-video");
      } else {
        // GRS AI — may return sync results or async task IDs
        const grsaiResults = await grsaiFn({
          prompt: body.prompt,
          aspectRatio: body.aspectRatio,
          n,
          model: body.model,
          urls: body.attachedUrls?.length ? body.attachedUrls : undefined,
        });

        // Check for synchronous results (AIGATE returned images directly)
        const syncUrls = grsaiResults.flatMap((p) => p.urls ?? []);
        if (syncUrls.length > 0) {
          const { safeUrls } = await filterSafeImageUrls(syncUrls, nsfwDetectorFn);
          if (safeUrls.length === 0) {
            const [refunded] = await db
              .update(userTable)
              .set({ credits: sql`${userTable.credits} + ${maxCost}` })
              .where(eq(userTable.id, userId))
              .returning({ credits: userTable.credits });
            await auditAiSpend({
              db,
              userId,
              credits: maxCost,
              provider: "grsai",
              model,
              apiCallCount: grsaiResults.length,
              status: "refunded",
              metadata: { error: CONTENT_SAFETY_BLOCK_MESSAGE, sync: true },
            });
            return jsonResponse(
              {
                error: CONTENT_SAFETY_BLOCK_MESSAGE,
                creditsRemaining: refunded?.credits ?? deducted.credits + maxCost,
              },
              400,
            );
          }
          await auditAiSpend({
            db,
            userId,
            credits: maxCost,
            provider: "grsai",
            model,
            apiCallCount: grsaiResults.length,
            status: "succeeded",
            sourceId: grsaiResults.map((p) => p.id).join(","),
            metadata: { sync: true, resultCount: safeUrls.length },
          });
          return jsonResponse(
            { urls: safeUrls, creditsRemaining: deducted.credits, sync: true, watermark },
            200,
          );
        }

        predictions = grsaiResults;

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
      // Try Workers AI fallback before giving up
      const isVideoModel = model.startsWith("z-video");
      console.warn(
        `[generate] Primary ${isVideoModel ? "video" : "image"} failed, trying Workers AI fallback:`,
        err,
      );
      try {
        if (isVideoModel) {
          const fbResult = await generateVideoFallback(
            body.prompt,
            body.aspectRatio || "1:1",
            body.duration || 5,
          );
          if (fbResult.urls.length > 0) {
            await auditAiSpend({
              db,
              userId,
              credits: maxCost,
              provider: "workers-ai",
              model: "video-fallback",
              apiCallCount: 1,
              status: "succeeded",
              metadata: { primaryProvider: "replicate", productModel: model },
            });
            return jsonResponse(
              {
                urls: fbResult.urls,
                creditsRemaining: deducted.credits,
                sync: true,
                watermark: true,
                fallback: true,
              },
              200,
            );
          }
        } else {
          const fbResult = await generateImageFallback(body.prompt, body.aspectRatio || "1:1", n);
          if (fbResult.urls.length > 0) {
            const { safeUrls } = await filterSafeImageUrls(fbResult.urls, nsfwDetectorFn);
            if (safeUrls.length === 0) {
              throw new Error(CONTENT_SAFETY_BLOCK_MESSAGE);
            }
            await auditAiSpend({
              db,
              userId,
              credits: maxCost,
              provider: "workers-ai",
              model: "image-fallback",
              apiCallCount: n,
              status: "succeeded",
              metadata: {
                primaryProvider: model === "z-image-fast" ? "replicate" : "grsai",
                productModel: model,
              },
            });
            return jsonResponse(
              {
                urls: safeUrls,
                creditsRemaining: deducted.credits,
                sync: true,
                watermark: true,
                fallback: true,
              },
              200,
            );
          }
        }
      } catch (fbErr) {
        console.error("[generate] Workers AI fallback also failed:", fbErr);
      }
      // Refund credits on creation failure
      const [refunded] = await db
        .update(userTable)
        .set({ credits: sql`${userTable.credits} + ${maxCost}` })
        .where(eq(userTable.id, userId))
        .returning({ credits: userTable.credits });
      const message = err instanceof Error ? err.message : "Generation failed";
      await auditAiSpend({
        db,
        userId,
        credits: maxCost,
        provider: model === "z-image-fast" || model.startsWith("z-video") ? "replicate" : "grsai",
        model,
        apiCallCount: n,
        status: "refunded",
        metadata: { error: message },
      });
      return jsonResponse(
        { error: message, creditsRemaining: refunded?.credits ?? deducted.credits + maxCost },
        500,
      );
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

    const generationId = crypto.randomUUID();
    try {
      await db.insert(generation).values({
        id: generationId,
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

    await auditAiSpend({
      db,
      userId,
      credits: maxCost,
      provider: model === "z-image-fast" || model.startsWith("z-video") ? "replicate" : "grsai",
      model,
      apiCallCount: predictionIds.length,
      status: "succeeded",
      sourceId: generationId,
      metadata: { async: true, predictionIds },
    });

    // Store generation ID in KV so webhook/poll can update resultUrls
    try {
      const kv = getKvBinding();
      if (kv) {
        await Promise.all(
          predictionIds.map((pid) =>
            kv.put(
              `gen:${pid}`,
              JSON.stringify({ generationId, userId, creditsUsed: maxCost, predictionIds }),
              {
                expirationTtl: 3600,
              },
            ),
          ),
        );
        console.log(
          `[generate] Stored ${predictionIds.length} KV entries for generation ${generationId}`,
        );
      } else {
        console.warn("[generate] KV binding not available, R2 mirroring will not work");
      }
    } catch (err) {
      console.error("[generate] Failed to store KV entries:", err);
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
        const originError = requireValidOrigin(request);
        if (originError) return originError;

        const auth = createAuth();
        if (!auth) return dbUnavailable();

        const session = await auth.api.getSession({ headers: request.headers });

        if (!session?.user?.id) {
          return jsonResponse({ error: "Please login to generate" }, 401);
        }

        const userLimit = checkRateLimit(`generate:user:${session.user.id}`, 30, 60);
        if (!userLimit.allowed) {
          return jsonResponse(
            { error: "Rate limit exceeded. Please wait before generating more." },
            429,
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
