import { createFileRoute } from "@tanstack/react-router";

import { pollReplicatePrediction } from "@/lib/ai";
import { createAuth } from "@/lib/auth/auth";

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
          return new Response(JSON.stringify({ error: "Database not available" }), {
            status: 501,
            headers: { "Content-Type": "application/json" },
          });
        }

        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user?.id) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const url = new URL(request.url);
        const idsParam = url.searchParams.get("ids");
        const type = url.searchParams.get("type") || "replicate";

        if (!idsParam) {
          return new Response(JSON.stringify({ error: "Missing ids parameter" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
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

            return new Response(JSON.stringify({ results }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
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

          return new Response(
            JSON.stringify({
              results: results.map((r, i) => ({ id: ids[i], ...r })),
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
