import { createFileRoute } from "@tanstack/react-router";
import { eq, sql } from "drizzle-orm";

import { pollReplicatePrediction } from "@/lib/ai";
import { jsonResponse } from "@/lib/api-helpers";
import { createAuth } from "@/lib/auth/auth";
import { getD1Binding, getKvBinding } from "@/lib/cloudflare/bindings";
import { mirrorImageToR2 } from "@/lib/cloudflare/r2";
import { recordAiCreditSpend } from "@/lib/credits/audit";
import { getDb } from "@/lib/db";
import { user as userTable } from "@/lib/db/schema/auth.schema";
import { generation } from "@/lib/db/schema/data-flywheel.schema";
import { checkRateLimit } from "@/lib/rate-limit";

interface GrsTaskData {
  userId: string;
  status: string;
  urls?: string[];
  error?: string;
}

interface GenerationTaskData {
  generationId?: string;
  userId?: string;
  creditsUsed?: number;
  predictionIds?: string[];
}

interface StatusResult {
  id: string;
  status: string;
  urls: string[] | null;
  error: string | null;
  creditsRemaining?: number;
}

function mergeUniqueUrls(existing: string[], incoming: string[]): string[] {
  return [...new Set([...existing, ...incoming])];
}

function parseUrlList(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((url): url is string => typeof url === "string")
      : [];
  } catch {
    return [];
  }
}

function safePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function parseOwnerId(raw: string | null): string | null {
  return parseGenerationTaskData(raw)?.userId ?? null;
}

function parseGuestToken(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as { guestToken?: string };
    return typeof data.guestToken === "string" ? data.guestToken : null;
  } catch {
    return null;
  }
}

function parseGenerationTaskData(raw: string | null): GenerationTaskData | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as GenerationTaskData;
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

function isRefundableStatus(status: string): boolean {
  return status === "failed" || status === "canceled" || status === "error";
}

async function refundFailedPrediction(
  kv: KVNamespace | undefined,
  predictionId: string,
  sessionUserId: string | null,
): Promise<number | undefined> {
  if (!kv || !sessionUserId) return undefined;

  const genData = parseGenerationTaskData(await kv.get(`gen:${predictionId}`));
  if (!genData?.generationId) return undefined;
  if (genData.userId && genData.userId !== sessionUserId) return undefined;

  const refundKey = `refund:${predictionId}`;
  if (await kv.get(refundKey)) return undefined;

  const binding = getD1Binding();
  if (!binding) return undefined;
  const db = getDb(binding);

  const [row] = await db
    .select({
      userId: generation.userId,
      creditsUsed: generation.creditsUsed,
      model: generation.model,
    })
    .from(generation)
    .where(eq(generation.id, genData.generationId))
    .limit(1);
  if (!row || row.userId !== sessionUserId) return undefined;

  const totalCredits = genData.creditsUsed ?? row.creditsUsed;
  const totalPredictions = genData.predictionIds?.length || 1;
  const creditsToRefund = Math.max(1, Math.round(totalCredits / totalPredictions));

  const [updated] = await db
    .update(userTable)
    .set({ credits: sql`${userTable.credits} + ${creditsToRefund}` })
    .where(eq(userTable.id, sessionUserId))
    .returning({ credits: userTable.credits });

  await kv.put(
    refundKey,
    JSON.stringify({
      userId: sessionUserId,
      generationId: genData.generationId,
      creditsRefunded: creditsToRefund,
      createdAt: Date.now(),
    }),
    { expirationTtl: 7 * 24 * 60 * 60 },
  );

  try {
    await recordAiCreditSpend({
      db,
      userId: sessionUserId,
      credits: creditsToRefund,
      provider:
        row.model.startsWith("z-video") || row.model === "z-image-fast" ? "replicate" : "grsai",
      model: row.model,
      apiCallCount: 1,
      status: "refunded",
      sourceId: genData.generationId,
      metadata: { predictionId, reason: "async_generation_failed" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[credit-audit] Failed to record async refund:", message);
  }

  return updated?.credits;
}

async function attachRefundsToFailedResults(
  kv: KVNamespace | undefined,
  results: StatusResult[],
  userId: string | null,
): Promise<StatusResult[]> {
  return Promise.all(
    results.map(async (result) => {
      if (!isRefundableStatus(result.status)) return result;
      const creditsRemaining = await refundFailedPrediction(kv, result.id, userId);
      return creditsRemaining == null ? result : { ...result, creditsRemaining };
    }),
  );
}

async function tryUpdateGeneration(kv: KVNamespace, predictionId: string, urls: string[]) {
  try {
    const kvKey = `gen:${predictionId}`;
    console.log(`[gen-status] tryUpdateGeneration: looking up KV key=${kvKey}`);
    const genRaw = await kv.get(kvKey);
    if (!genRaw) {
      console.warn(
        `[gen-status] No KV entry for prediction ${predictionId} (key=${kvKey}), cannot update generation`,
      );
      return;
    }
    console.log(`[gen-status] Found KV entry for ${predictionId}:`, genRaw.slice(0, 200));
    const genData = JSON.parse(genRaw) as { generationId: string; userId: string };
    const binding = getD1Binding();
    if (!binding) {
      console.warn("[gen-status] D1 binding not available, cannot update generation");
      return;
    }

    // Mirror images to R2 for permanent storage.
    const r2Urls = await Promise.all(
      urls.map((url, i) =>
        mirrorImageToR2(
          url,
          `generations/${genData.userId}/${genData.generationId}/${safePathSegment(predictionId)}-${i}.png`,
        ),
      ),
    );

    const db = getDb(binding);
    const [existing] = await db
      .select({ resultUrls: generation.resultUrls })
      .from(generation)
      .where(eq(generation.id, genData.generationId))
      .limit(1);
    const mergedUrls = mergeUniqueUrls(parseUrlList(existing?.resultUrls ?? "[]"), r2Urls);
    await db
      .update(generation)
      .set({ resultUrls: JSON.stringify(mergedUrls) })
      .where(eq(generation.id, genData.generationId));
    console.log(
      `[gen-status] Updated generation ${genData.generationId} with ${mergedUrls.length} URLs`,
    );
  } catch (err) {
    console.error("[gen-status] Failed to update generation record:", err);
  }
}

export async function handleGenerateStatus(request: Request): Promise<Response> {
  const auth = createAuth();
  if (!auth) {
    return jsonResponse({ error: "Database not available" }, 501);
  }

  const session = await auth.api.getSession({ headers: request.headers });
  const guestToken = request.headers.get("x-guest-token");
  const userId = session?.user?.id || null;
  if (!userId && !guestToken) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const limitKey = userId ? `generate-status:${userId}` : `generate-status:guest:${guestToken}`;
  const limit = checkRateLimit(limitKey, 30, 10);
  if (!limit.allowed) {
    return jsonResponse({ error: "Too many status checks. Please slow down." }, 429);
  }

  // Nitro injects waitUntil from the Cloudflare execution context
  const req = request as Request & { waitUntil?: (p: Promise<unknown>) => void };
  const waitUntil = req.waitUntil?.bind(req) ?? ((_p: Promise<unknown>) => {});
  let mirrorTaskChain = Promise.resolve();
  const scheduleMirrorTask = (task: () => Promise<void>) => {
    mirrorTaskChain = mirrorTaskChain.then(task, task);
  };
  const flushMirrorTasks = () => {
    waitUntil(mirrorTaskChain);
    return mirrorTaskChain;
  };

  const url = new URL(request.url);
  const idsParam = url.searchParams.get("ids");
  const type = url.searchParams.get("type") || "replicate";

  if (!idsParam) {
    return jsonResponse({ error: "Missing ids parameter" }, 400);
  }

  const ids = idsParam.split(",").filter(Boolean);

  try {
    const kv = getKvBinding();
    if (type === "grs") {
      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            if (!kv) return { id, status: "error", urls: null, error: "KV not available" };
            const raw = await kv.get(`grs:${id}`);
            if (!raw) return { id, status: "processing", urls: null, error: null };
            const data: GrsTaskData = JSON.parse(raw);
            const ownerId = data.userId;
            if (ownerId !== userId) {
              return { id, status: "error", urls: null, error: "Not found" };
            }
            if (data.status === "succeeded" && data.urls?.length) {
              scheduleMirrorTask(() => tryUpdateGeneration(kv, id, data.urls!));
              return { id, status: "succeeded", urls: data.urls, error: null };
            }
            if (data.status === "succeeded") {
              return {
                id,
                status: "failed",
                urls: null,
                error: "Generation finished without image URLs",
              };
            }
            if (data.status === "failed") {
              return {
                id,
                status: "failed",
                urls: null,
                error: data.error || "Generation failed",
              };
            }
            return { id, status: "processing", urls: null, error: null };
          } catch {
            return { id, status: "error", urls: null, error: "Poll failed" };
          }
        }),
      );

      await flushMirrorTasks();
      const refundedResults = await attachRefundsToFailedResults(kv, results, userId);
      return jsonResponse({ results: refundedResults }, 200);
    }

    // Replicate type (default)
    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          if (kv) {
            const guestRaw = await kv.get(`guest:${id}`);
            if (guestRaw) {
              const guestOwner = parseGuestToken(guestRaw);
              if (!guestToken || guestOwner !== guestToken) {
                return { id, status: "error", urls: null, error: "Not found" };
              }
            } else {
              const ownerId = parseOwnerId(await kv.get(`gen:${id}`));
              if (ownerId && ownerId !== userId) {
                return { id, status: "error", urls: null, error: "Not found" };
              }
            }
          }
          return await pollReplicatePrediction(id);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Poll failed";
          return { id, status: "error", urls: null, error: message };
        }
      }),
    );

    // Update generation records for succeeded Replicate results
    if (kv) {
      for (const [i, r] of results.entries()) {
        if (r.status === "succeeded" && r.urls?.length) {
          scheduleMirrorTask(() => tryUpdateGeneration(kv, ids[i], r.urls!));
        }
      }
    }

    await flushMirrorTasks();
    const resultsWithIds = results.map((r, i) => ({ id: ids[i], ...r }));
    const refundedResults = await attachRefundsToFailedResults(kv, resultsWithIds, userId);
    return jsonResponse({ results: refundedResults }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
}

export const Route = createFileRoute("/api/generate-status")({
  server: {
    handlers: {
      GET: async ({ request }) => handleGenerateStatus(request),
    },
  },
});
