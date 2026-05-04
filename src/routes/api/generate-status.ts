import { createFileRoute } from "@tanstack/react-router";

import { pollReplicatePrediction } from "@/lib/ai";
import { createAuth } from "@/lib/auth/auth";

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
        if (!idsParam) {
          return new Response(JSON.stringify({ error: "Missing ids parameter" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
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
