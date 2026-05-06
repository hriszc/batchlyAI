import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";

import { jsonResponse } from "@/lib/api-helpers";
import { createAuth } from "@/lib/auth/auth";
import { getDb } from "@/lib/db";
import { work, workLike } from "@/lib/db/schema/work.schema";

function getD1Binding(): D1Database | undefined {
  const platformEnv = (globalThis as Record<string, unknown>).__env__ as
    | Record<string, unknown>
    | undefined;
  return platformEnv?.batchlyai_db as D1Database | undefined;
}

export const Route = createFileRoute("/api/works/like")({
  server: {
    handlers: {
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
          const body = (await request.json()) as { workId?: string };
          const { workId: targetWorkId } = body;

          if (!targetWorkId) {
            return jsonResponse({ error: "workId is required" }, 400);
          }

          // Check if work exists
          const [existingWork] = await db
            .select({ id: work.id, likeCount: work.likeCount })
            .from(work)
            .where(eq(work.id, targetWorkId))
            .limit(1);

          if (!existingWork) {
            return jsonResponse({ error: "Work not found" }, 404);
          }

          // Check if already liked
          const [existingLike] = await db
            .select({ id: workLike.id })
            .from(workLike)
            .where(
              and(
                eq(workLike.userId, session.user.id),
                eq(workLike.workId, targetWorkId),
              ),
            )
            .limit(1);

          let liked: boolean;
          let newLikeCount: number;

          if (existingLike) {
            // Unlike: delete like and decrement count
            await db.delete(workLike).where(eq(workLike.id, existingLike.id));
            const newCount = Math.max(0, existingWork.likeCount - 1);
            await db
              .update(work)
              .set({ likeCount: newCount })
              .where(eq(work.id, targetWorkId));
            liked = false;
            newLikeCount = newCount;
          } else {
            // Like: insert like and increment count
            const likeId = `like_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            await db.insert(workLike).values({
              id: likeId,
              userId: session.user.id,
              workId: targetWorkId,
              createdAt: Math.floor(Date.now() / 1000),
            });
            const newCount = existingWork.likeCount + 1;
            await db
              .update(work)
              .set({ likeCount: newCount })
              .where(eq(work.id, targetWorkId));
            liked = true;
            newLikeCount = newCount;
          }

          return jsonResponse({ liked, likeCount: newLikeCount }, 200);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to toggle like";
          return jsonResponse({ error: message }, 500);
        }
      },
    },
  },
});
