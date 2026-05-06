import { createFileRoute } from "@tanstack/react-router";
import { and, desc, eq, like, or, sql } from "drizzle-orm";

import { jsonResponse } from "@/lib/api-helpers";
import { createAuth } from "@/lib/auth/auth";
import { getDb } from "@/lib/db";
import { savedPrompt } from "@/lib/db/schema";

function getD1Binding(): D1Database | undefined {
  const platformEnv = (globalThis as Record<string, unknown>).__env__ as
    | Record<string, unknown>
    | undefined;
  return platformEnv?.batchlyai_db as D1Database | undefined;
}

export const Route = createFileRoute("/api/prompts")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = createAuth();
        if (!auth) return jsonResponse({ error: "Auth unavailable" }, 501);

        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user?.id) {
          return jsonResponse({ error: "Unauthorized" }, 401);
        }

        const binding = getD1Binding();
        if (!binding) return jsonResponse({ error: "DB unavailable" }, 501);
        const db = getDb(binding);

        const url = new URL(request.url);
        const search = url.searchParams.get("search") || "";
        const tag = url.searchParams.get("tag") || "";

        let query = db
          .select()
          .from(savedPrompt)
          .where(eq(savedPrompt.userId, session.user.id))
          .$dynamic();

        if (search) {
          query = query.where(like(savedPrompt.name, `%${search}%`));
        }

        if (tag) {
          query = query.where(like(savedPrompt.tags, `%"${tag}"%`));
        }

        const rows = await query.orderBy(desc(savedPrompt.createdAt));

        const parsed = rows.map((r) => ({
          ...r,
          tags: JSON.parse(r.tags),
          variableGroups: JSON.parse(r.variableGroups),
        }));

        return jsonResponse({ prompts: parsed }, 200);
      },
      POST: async ({ request }) => {
        const auth = createAuth();
        if (!auth) return jsonResponse({ error: "Auth unavailable" }, 501);

        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user?.id) {
          return jsonResponse({ error: "Unauthorized" }, 401);
        }

        const body = (await request.json()) as {
          name?: string;
          promptTemplate?: string;
          variableGroups?: unknown;
          model?: string;
          tags?: string[];
        };

        if (!body.name || !body.promptTemplate) {
          return jsonResponse(
            { error: "Missing required fields: name, promptTemplate" },
            400,
          );
        }

        const binding = getD1Binding();
        if (!binding) return jsonResponse({ error: "DB unavailable" }, 501);
        const db = getDb(binding);

        const id = `sp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const now = Math.floor(Date.now() / 1000);

        await db.insert(savedPrompt).values({
          id,
          userId: session.user.id,
          name: body.name,
          promptTemplate: body.promptTemplate,
          variableGroups: body.variableGroups
            ? JSON.stringify(body.variableGroups)
            : "[]",
          model: body.model || "z-image-pro",
          tags: body.tags ? JSON.stringify(body.tags) : "[]",
          createdAt: now,
        });

        return jsonResponse({ id }, 201);
      },
      DELETE: async ({ request }) => {
        const auth = createAuth();
        if (!auth) return jsonResponse({ error: "Auth unavailable" }, 501);

        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user?.id) {
          return jsonResponse({ error: "Unauthorized" }, 401);
        }

        const body = (await request.json()) as { id?: string };

        if (!body.id) {
          return jsonResponse({ error: "Missing required field: id" }, 400);
        }

        const binding = getD1Binding();
        if (!binding) return jsonResponse({ error: "DB unavailable" }, 501);
        const db = getDb(binding);

        // Only allow deletion of own prompts
        await db
          .delete(savedPrompt)
          .where(
            and(
              eq(savedPrompt.id, body.id),
              eq(savedPrompt.userId, session.user.id),
            ),
          );

        return jsonResponse({ success: true }, 200);
      },
    },
  },
});
