import { createFileRoute } from "@tanstack/react-router";
import { desc, eq, sql } from "drizzle-orm";

import { jsonResponse } from "@/lib/api-helpers";
import { createAuth } from "@/lib/auth/auth";
import { getDb } from "@/lib/db";
import { user as userTable } from "@/lib/db/schema/auth.schema";
import { work, workComment } from "@/lib/db/schema/work.schema";

function getD1Binding(): D1Database | undefined {
  const platformEnv = (globalThis as Record<string, unknown>).__env__ as
    | Record<string, unknown>
    | undefined;
  return platformEnv?.batchlyai_db as D1Database | undefined;
}

export const Route = createFileRoute("/api/works/comment")({
  server: {
    handlers: {
      // GET /api/works/comment?workId=&limit=20&offset=0
      GET: async ({ request }) => {
        const binding = getD1Binding();
        if (!binding) return jsonResponse({ error: "DB unavailable" }, 501);
        const db = getDb(binding);

        try {
          const url = new URL(request.url);
          const targetWorkId = url.searchParams.get("workId");
          const limit = Math.min(Number(url.searchParams.get("limit")) || 20, 50);
          const offset = Number(url.searchParams.get("offset")) || 0;

          if (!targetWorkId) {
            return jsonResponse({ error: "workId query parameter is required" }, 400);
          }

          const comments = await db
            .select({
              id: workComment.id,
              content: workComment.content,
              createdAt: workComment.createdAt,
              userName: userTable.name,
              userImage: userTable.image,
            })
            .from(workComment)
            .leftJoin(userTable, eq(workComment.userId, userTable.id))
            .where(eq(workComment.workId, targetWorkId))
            .orderBy(desc(workComment.createdAt))
            .limit(limit)
            .offset(offset);

          return jsonResponse({ comments }, 200);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to fetch comments";
          return jsonResponse({ error: message }, 500);
        }
      },

      // POST /api/works/comment — add a comment
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
          const body = (await request.json()) as { workId?: string; content?: string };
          const { workId: targetWorkId, content } = body;

          if (!targetWorkId) {
            return jsonResponse({ error: "workId is required" }, 400);
          }

          if (!content || !content.trim()) {
            return jsonResponse({ error: "content is required" }, 400);
          }

          if (content.length > 1000) {
            return jsonResponse({ error: "content must be under 1000 characters" }, 400);
          }

          // Verify work exists
          const [existingWork] = await db
            .select({ id: work.id })
            .from(work)
            .where(eq(work.id, targetWorkId))
            .limit(1);

          if (!existingWork) {
            return jsonResponse({ error: "Work not found" }, 404);
          }

          const commentId = `comment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          const now = Math.floor(Date.now() / 1000);

          await db.insert(workComment).values({
            id: commentId,
            userId: session.user.id,
            workId: targetWorkId,
            content: content.trim(),
            createdAt: now,
          });

          // Increment comment count atomically
          await db
            .update(work)
            .set({ commentCount: sql`${work.commentCount} + 1` })
            .where(eq(work.id, targetWorkId));

          return jsonResponse(
            {
              id: commentId,
              content: content.trim(),
              createdAt: now,
              userName: session.user.name,
            },
            201,
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to add comment";
          return jsonResponse({ error: message }, 500);
        }
      },
    },
  },
});
