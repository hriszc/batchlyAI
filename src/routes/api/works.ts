import { createFileRoute } from "@tanstack/react-router";
import { desc, eq, sql } from "drizzle-orm";

import { jsonResponse } from "@/lib/api-helpers";
import { createAuth } from "@/lib/auth/auth";
import { getDb } from "@/lib/db";
import { user as userTable } from "@/lib/db/schema/auth.schema";
import { work } from "@/lib/db/schema/work.schema";

function getD1Binding(): D1Database | undefined {
  const platformEnv = (globalThis as Record<string, unknown>).__env__ as
    | Record<string, unknown>
    | undefined;
  return platformEnv?.batchlyai_db as D1Database | undefined;
}

export const Route = createFileRoute("/api/works")({
  server: {
    handlers: {
      // GET /api/works — list works for discover page
      // Query params: ?category=&sort=hot|new&limit=20&offset=0&remix=<workId>
      GET: async ({ request }) => {
        const binding = getD1Binding();
        if (!binding) return jsonResponse({ error: "DB unavailable" }, 501);
        const db = getDb(binding);

        try {
          const url = new URL(request.url);
          const category = url.searchParams.get("category") || undefined;
          const sort = url.searchParams.get("sort") || "hot";
          const limit = Math.min(Number(url.searchParams.get("limit")) || 20, 50);
          const offset = Number(url.searchParams.get("offset")) || 0;
          const remixId = url.searchParams.get("remix");

          // Fetch single work for remix
          if (remixId) {
            const [w] = await db
              .select({
                id: work.id,
                promptTemplate: work.promptTemplate,
                resultImageUrl: work.resultImageUrl,
                title: work.title,
                model: work.model,
                aspectRatio: work.aspectRatio,
                category: work.category,
                likeCount: work.likeCount,
                commentCount: work.commentCount,
                remixCount: work.remixCount,
                createdAt: work.createdAt,
                userName: userTable.name,
              })
              .from(work)
              .leftJoin(userTable, eq(work.userId, userTable.id))
              .where(eq(work.id, remixId))
              .limit(1);

            if (!w) return jsonResponse({ error: "Work not found" }, 404);
            return jsonResponse({ work: w }, 200);
          }

          // List works with filtering
          const whereClause = category ? eq(work.category, category) : undefined;

          const orderBy =
            sort === "new" ? desc(work.createdAt) : desc(work.likeCount);

          const rows = await db
            .select({
              id: work.id,
              promptTemplate: work.promptTemplate,
              resultImageUrl: work.resultImageUrl,
              title: work.title,
              model: work.model,
              aspectRatio: work.aspectRatio,
              category: work.category,
              likeCount: work.likeCount,
              commentCount: work.commentCount,
              remixCount: work.remixCount,
              createdAt: work.createdAt,
              userName: userTable.name,
            })
            .from(work)
            .leftJoin(userTable, eq(work.userId, userTable.id))
            .where(whereClause)
            .orderBy(orderBy)
            .limit(limit)
            .offset(offset);

          // Count total for the given category
          const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(work)
            .where(whereClause);
          const total = countResult[0]?.count ?? 0;

          return jsonResponse({ works: rows, total, limit, offset }, 200);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to fetch works";
          return jsonResponse({ error: message }, 500);
        }
      },

      // POST /api/works — publish a work
      POST: async ({ request }) => {
        const auth = createAuth();
        if (!auth) return jsonResponse({ error: "Auth unavailable" }, 501);

        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user?.id) {
          return jsonResponse({ error: "Unauthorized" }, 401);
        }

        const binding = getD1Binding();
        if (!binding) return jsonResponse({ error: "DB unavailable" }, 501);
        const db = getDb(binding);

        try {
          const body = (await request.json()) as {
            promptTemplate?: string;
            resultImageUrl?: string;
            title?: string;
            model?: string;
            aspectRatio?: string;
            category?: string;
          };

          if (!body.promptTemplate || !body.resultImageUrl) {
            return jsonResponse(
              { error: "promptTemplate and resultImageUrl are required" },
              400,
            );
          }

          const workId = `work_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          const now = Math.floor(Date.now() / 1000);

          await db.insert(work).values({
            id: workId,
            userId: session.user.id,
            promptTemplate: body.promptTemplate,
            resultImageUrl: body.resultImageUrl,
            title: body.title || "",
            model: body.model || "z-image-pro",
            aspectRatio: body.aspectRatio || "9:16",
            category: body.category || "general",
            likeCount: 0,
            commentCount: 0,
            remixCount: 0,
            createdAt: now,
          });

          return jsonResponse({ workId, id: workId }, 201);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to create work";
          return jsonResponse({ error: message }, 500);
        }
      },
    },
  },
});
