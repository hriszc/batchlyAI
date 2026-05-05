import { createFileRoute } from "@tanstack/react-router";

import { jsonResponse } from "@/lib/api-helpers";
import { pollReplicatePrediction } from "@/lib/ai";
import { createAuth } from "@/lib/auth/auth";
import { checkRateLimit } from "@/lib/rate-limit";

interface GrsTaskData {
  userId: string;
  status: string;
  urls?: string[];
  error?: string;
}

function getKvBinding(): KVNamespace | undefined {
  const platformEnv = (globalThis as Record<string, unknown>).__env__ as
    | Record<string, unknown>
    | undefined;
  return platformEnv?.batchlyai_kv as KVNamespace | undefined;
}

export const Route = createFileRoute("/api/generate-status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = createAuth();
        if (!auth) {
          return jsonResponse({ error: "Database not available" }, 501);
        }

        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user?.id) {
          return jsonResponse({ error: "Unauthorized" }, 401);
        }

        const ip = request.headers.get("CF-Connecting-IP") || "unknown";
        const limit = checkRateLimit(`generate-status:ip:${ip}`, 60, 60);
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

          return jsonResponse(
            { results: results.map((r, i) => ({ id: ids[i], ...r })) },
            200,
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          return jsonResponse({ error: message }, 500);
        }
      },
    },
  },
});
