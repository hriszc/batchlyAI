import { createFileRoute } from "@tanstack/react-router";

import { jsonResponse } from "@/lib/api-helpers";
import { pollReplicatePrediction } from "@/lib/ai";
import { createAuth } from "@/lib/auth/auth";
import { checkRateLimit } from "@/lib/rate-limit";

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
        if (!idsParam) {
          return jsonResponse({ error: "Missing ids parameter" }, 400);
        }

        const ids = idsParam.split(",").filter(Boolean);

        try {
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
