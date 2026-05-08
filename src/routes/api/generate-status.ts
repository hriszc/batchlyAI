import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";

import { pollReplicatePrediction } from "@/lib/ai";
import { jsonResponse } from "@/lib/api-helpers";
import { createAuth } from "@/lib/auth/auth";
import { getD1Binding, getKvBinding } from "@/lib/cloudflare/bindings";
import { mirrorImageToR2 } from "@/lib/cloudflare/r2";
import { getDb } from "@/lib/db";
import { generation } from "@/lib/db/schema/data-flywheel.schema";
import { checkRateLimit } from "@/lib/rate-limit";

interface GrsTaskData {
  userId: string;
  status: string;
  urls?: string[];
  error?: string;
}

async function tryUpdateGeneration(kv: KVNamespace, predictionId: string, urls: string[]) {
  try {
    const genRaw = await kv.get(`gen:${predictionId}`);
    if (!genRaw) {
      console.warn(
        `[gen-status] No KV entry for prediction ${predictionId}, cannot update generation`,
      );
      return;
    }
    const genData = JSON.parse(genRaw) as { generationId: string; userId: string };
    const binding = getD1Binding();
    if (!binding) {
      console.warn("[gen-status] D1 binding not available, cannot update generation");
      return;
    }

    // Mirror images to R2 for permanent storage
    const r2Urls = await Promise.all(
      urls.map((url, i) =>
        mirrorImageToR2(url, `generations/${genData.userId}/${genData.generationId}/${i}.png`),
      ),
    );

    const db = getDb(binding);
    await db
      .update(generation)
      .set({ resultUrls: JSON.stringify(r2Urls) })
      .where(eq(generation.id, genData.generationId));
    console.log(
      `[gen-status] Updated generation ${genData.generationId} with ${r2Urls.length} URLs`,
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
  if (!session?.user?.id) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const limit = checkRateLimit(`generate-status:${session.user.id}`, 30, 10);
  if (!limit.allowed) {
    return jsonResponse({ error: "Too many status checks. Please slow down." }, 429);
  }

  const url = new URL(request.url);
  const idsParam = url.searchParams.get("ids");
  const type = url.searchParams.get("type") || "replicate";

  if (!idsParam) {
    return jsonResponse({ error: "Missing ids parameter" }, 400);
  }

  const ids = idsParam.split(",").filter(Boolean);

  try {
    if (type === "grs") {
      const kv = getKvBinding();
      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            if (!kv) return { id, status: "error", urls: null, error: "KV not available" };
            const raw = await kv.get(`grs:${id}`);
            if (!raw) return { id, status: "processing", urls: null, error: null };
            const data: GrsTaskData = JSON.parse(raw);
            if (data.status === "succeeded" && data.urls) {
              void tryUpdateGeneration(kv, id, data.urls);
              return { id, status: "succeeded", urls: data.urls, error: null };
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

      return jsonResponse({ results }, 200);
    }

    // Replicate type (default)
    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          return await pollReplicatePrediction(id);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Poll failed";
          return { id, status: "error", urls: null, error: message };
        }
      }),
    );

    // Update generation records for succeeded Replicate results
    const kv = getKvBinding();
    if (kv) {
      for (const [i, r] of results.entries()) {
        if (r.status === "succeeded" && r.urls?.length) {
          void tryUpdateGeneration(kv, ids[i], r.urls);
        }
      }
    }

    return jsonResponse({ results: results.map((r, i) => ({ id: ids[i], ...r })) }, 200);
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
