import { createFileRoute } from "@tanstack/react-router";
import { and, eq, gte, sql } from "drizzle-orm";

import { generateImage, createReplicatePredictions } from "@/lib/ai";
import { jsonResponse } from "@/lib/api-helpers";
import { createAuth } from "@/lib/auth/auth";
import { getCachedResult, setCachedResult } from "@/lib/cache/prompt-cache";
import { getDb } from "@/lib/db";
import { user as userTable } from "@/lib/db/schema/auth.schema";
import { checkRateLimit } from "@/lib/rate-limit";
import { generateRequestSchema } from "@/lib/validation/schemas";

export const CREDIT_COST: Record<string, number> = {
  "z-image-fast": 10,
  "z-image-pro": 20,
  "z-text-fast": 5,
  "z-text-pro": 10,
  "z-video-fast": 40,
  "z-video-pro": 80,
};

function getD1Binding(): any | undefined {
  const platformEnv = (globalThis as Record<string, unknown>).__env__ as
    | Record<string, unknown>
    | undefined;
  return platformEnv?.batchlyai_db as any | undefined;
}

export interface GenerateContext {
  request: Request;
  db: ReturnType<typeof getDb>;
  userId: string;
  generateFn?: typeof generateImage;
  replicateFn?: typeof createReplicatePredictions;
  getCachedFn?: typeof getCachedResult;
  setCachedFn?: typeof setCachedResult;
}

export async function handleGenerate(ctx: GenerateContext): Promise<Response> {
  const {
    request,
    db,
    userId,
    generateFn = generateImage,
    replicateFn = createReplicatePredictions,
    getCachedFn = getCachedResult,
    setCachedFn = setCachedResult,
  } = ctx;

  try {
    const rawBody = await request.json();
    const parsed = generateRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return jsonResponse(
        { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
        400,
      );
    }

    const { prompt, aspectRatio, n, model } = parsed.data;
    const costPerUnit = CREDIT_COST[model] ?? 20;
    const maxCost = costPerUnit * n;

    // Check prompt cache first
    const cachedUrls = await getCachedFn(prompt, model, aspectRatio, n);
    if (cachedUrls) {
      return jsonResponse(
        { urls: cachedUrls, creditsRemaining: null, cached: true },
        200,
      );
    }

    // Atomically check and deduct credits before generation
    const [deducted] = await db
      .update(userTable)
      .set({ credits: sql`${userTable.credits} - ${maxCost}` })
      .where(
        and(
          eq(userTable.id, userId),
          gte(userTable.credits, maxCost),
        ),
      )
      .returning({ credits: userTable.credits });

    if (!deducted) {
      return jsonResponse(
        { error: "Insufficient credits", required: maxCost },
        402,
      );
    }

    // Async path: Replicate (z-image-fast)
    if (model === "z-image-fast") {
      let predictions;
      try {
        predictions = await replicateFn({
          prompt,
          aspectRatio,
          n,
        });
      } catch (err) {
        await db
          .update(userTable)
          .set({ credits: sql`${userTable.credits} + ${maxCost}` })
          .where(eq(userTable.id, userId));
        const message = err instanceof Error ? err.message : "Generation failed";
        return jsonResponse({ error: message }, 500);
      }

      const predictionIds = predictions.map((p) => p.id);
      const newBalance = deducted.credits - maxCost;

      return jsonResponse(
        { predictionIds, status: "processing", async: true, creditsRemaining: newBalance },
        200,
      );
    }

    // Sync path: grsaiapi (z-image-pro) or default
    let urls: string[];
    try {
      urls = await generateFn({
        prompt,
        aspectRatio,
        n,
        model,
      });
    } catch (err) {
      await db
        .update(userTable)
        .set({ credits: sql`${userTable.credits} + ${maxCost}` })
        .where(eq(userTable.id, userId));
      const message = err instanceof Error ? err.message : "Generation failed";
      return jsonResponse({ error: message }, 500);
    }

    const actualCost = urls.length * costPerUnit;
    const refund = maxCost - actualCost;

    if (refund > 0) {
      await db
        .update(userTable)
        .set({ credits: sql`${userTable.credits} + ${refund}` })
        .where(eq(userTable.id, userId));
    }

    const newBalance = deducted.credits - actualCost;

    if (urls.length > 0) {
      await setCachedFn(prompt, model, aspectRatio, urls.length, urls);
    }

    return jsonResponse({ urls, creditsRemaining: newBalance }, 200);
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
        if (!session?.user?.id) {
          return jsonResponse({ error: "Unauthorized" }, 401);
        }

        const ip = request.headers.get("CF-Connecting-IP") || "unknown";
        const userId = session.user.id;

        const userLimit = checkRateLimit(`generate:user:${userId}`, 30, 60);
        if (!userLimit.allowed) {
          return jsonResponse(
            { error: "Rate limit exceeded. Please wait before generating more." },
            429,
          );
        }

        const ipLimit = checkRateLimit(`generate:ip:${ip}`, 60, 60);
        if (!ipLimit.allowed) {
          return jsonResponse({ error: "Too many requests from this IP" }, 429);
        }

        const binding = getD1Binding();
        if (!binding) return dbUnavailable();

        return handleGenerate({
          request,
          db: getDb(binding),
          userId: session.user.id,
        });
      },
    },
  },
});

function dbUnavailable() {
  return jsonResponse({ error: "Database not available" }, 501);
}
