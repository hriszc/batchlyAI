import { createFileRoute } from "@tanstack/react-router";
import { and, eq, gte, sql } from "drizzle-orm";

import { createGrsaiPredictions, createReplicatePredictions } from "@/lib/ai";
import { createAuth } from "@/lib/auth/auth";
import { getCachedResult, setCachedResult } from "@/lib/cache/prompt-cache";
import { getDb } from "@/lib/db";
import { user as userTable } from "@/lib/db/schema/auth.schema";

export const CREDIT_COST: Record<string, number> = {
  "z-image-fast": 10,
  "z-image-pro": 20,
  "z-text-fast": 5,
  "z-text-pro": 10,
  "z-video-fast": 40,
  "z-video-pro": 80,
};

function getD1Binding(): D1Database | undefined {
  const platformEnv = (globalThis as Record<string, unknown>).__env__ as
    | Record<string, unknown>
    | undefined;
  return platformEnv?.batchlyai_db as D1Database | undefined;
}

function getKvBinding(): KVNamespace | undefined {
  const platformEnv = (globalThis as Record<string, unknown>).__env__ as
    | Record<string, unknown>
    | undefined;
  return platformEnv?.batchlyai_kv as KVNamespace | undefined;
}

export interface GenerateContext {
  request: Request;
  db: ReturnType<typeof getDb>;
  userId: string;
  replicateFn?: typeof createReplicatePredictions;
  grsaiFn?: typeof createGrsaiPredictions;
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
    getCachedFn = getCachedResult,
    setCachedFn = setCachedResult,
  } = ctx;

  try {
    const body = (await request.json()) as {
      prompt: string;
      aspectRatio?: string;
      n?: number;
      model?: string;
    };

    if (!body.prompt) {
      return jsonResponse({ error: "Missing prompt" }, 400);
    }

    const model = body.model || "z-image-pro";
    const n = body.n ?? 1;
    const costPerUnit = CREDIT_COST[model] ?? 20;
    const maxCost = costPerUnit * n;

    // Check prompt cache first
    const cachedUrls = await getCachedFn(body.prompt, model, body.aspectRatio || "1:1", n);
    if (cachedUrls) {
      return jsonResponse({ urls: cachedUrls, creditsRemaining: null, cached: true }, 200);
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

    // All generation is now async
    let predictions: { id: string; status: string }[];

    try {
      if (model === "z-image-fast") {
        predictions = await replicateFn({
          prompt: body.prompt,
          aspectRatio: body.aspectRatio,
          n,
        });
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

    return jsonResponse(
      {
        predictionIds,
        status: "processing",
        async: true,
        creditsRemaining: newBalance,
        modelType: model === "z-image-fast" ? "replicate" : "grs",
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
        if (!session?.user?.id) {
          return jsonResponse({ error: "Unauthorized" }, 401);
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

function jsonResponse(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function dbUnavailable() {
  return jsonResponse({ error: "Database not available" }, 501);
}
