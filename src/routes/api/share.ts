import { createFileRoute } from "@tanstack/react-router";

import { jsonResponse } from "@/lib/api-helpers";
import { createAuth } from "@/lib/auth/auth";
import { getDb } from "@/lib/db";
import { sharedBatch } from "@/lib/db/schema";

function getD1Binding(): D1Database | undefined {
  const platformEnv = (globalThis as Record<string, unknown>).__env__ as
    | Record<string, unknown>
    | undefined;
  return platformEnv?.batchlyai_db as D1Database | undefined;
}

export const Route = createFileRoute("/api/share")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = createAuth();
        if (!auth) return jsonResponse({ error: "Auth unavailable" }, 501);

        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user?.id) {
          return jsonResponse({ error: "Unauthorized" }, 401);
        }

        const body = (await request.json()) as {
          promptTemplate?: string;
          variableGroups?: unknown;
          resultImageUrls?: string[];
          model?: string;
          aspectRatio?: string;
        };

        if (!body.promptTemplate || !body.variableGroups || !body.resultImageUrls?.length) {
          return jsonResponse(
            { error: "Missing required fields: promptTemplate, variableGroups, resultImageUrls" },
            400,
          );
        }

        const binding = getD1Binding();
        if (!binding) return jsonResponse({ error: "DB unavailable" }, 501);
        const db = getDb(binding);

        const shareId = `share_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const now = Math.floor(Date.now() / 1000);

        await db.insert(sharedBatch).values({
          id: shareId,
          userId: session.user.id,
          promptTemplate: body.promptTemplate,
          variableGroups: JSON.stringify(body.variableGroups),
          resultImageUrls: JSON.stringify(body.resultImageUrls),
          model: body.model || "z-image-pro",
          aspectRatio: body.aspectRatio || "9:16",
          createdAt: now,
        });

        const origin = new URL(request.url).origin;
        return jsonResponse({ shareId, shareUrl: `${origin}/g/${shareId}` }, 200);
      },
    },
  },
});
