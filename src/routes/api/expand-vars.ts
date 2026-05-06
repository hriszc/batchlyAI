import { createFileRoute } from "@tanstack/react-router";

import { runExpandLLM } from "@/lib/ai";
import { jsonResponse } from "@/lib/api-helpers";
import { createAuth } from "@/lib/auth/auth";
import { getExpandCache, setExpandCache } from "@/lib/cache/prompt-cache";

export const Route = createFileRoute("/api/expand-vars")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = createAuth();
        if (!auth) {
          return jsonResponse({ error: "Database not available" }, 501);
        }

        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user?.id) {
          return jsonResponse({ error: "Unauthorized" }, 401);
        }

        let body: { descriptions: string[] };
        try {
          body = (await request.json()) as { descriptions: string[] };
        } catch {
          return jsonResponse({ error: "Invalid JSON body" }, 400);
        }

        if (!body.descriptions?.length || body.descriptions.length > 10) {
          return jsonResponse(
            { error: "descriptions must be a non-empty array with max 10 items" },
            400,
          );
        }

        const results: Record<string, string[]> = {};

        for (const desc of body.descriptions) {
          const trimmed = desc.trim();
          if (!trimmed || trimmed.length > 200) {
            results[desc] = [];
            continue;
          }

          try {
            const cached = await getExpandCache(trimmed);
            if (cached) {
              results[desc] = cached;
              continue;
            }

            const expanded = await runExpandLLM(trimmed);
            await setExpandCache(trimmed, expanded);
            results[desc] = expanded;
          } catch (err) {
            // Return empty array for this description on failure
            results[desc] = [];
          }
        }

        return jsonResponse({ results }, 200);
      },
    },
  },
});
