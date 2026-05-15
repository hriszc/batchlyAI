import { createFileRoute } from "@tanstack/react-router";
import { and, eq, sql } from "drizzle-orm";

import { jsonResponse, requireValidOrigin } from "@/lib/api-helpers";
import { createAuth } from "@/lib/auth/auth";
import { getD1Binding } from "@/lib/cloudflare/bindings";
import { getDb } from "@/lib/db";
import { work, workLike } from "@/lib/db/schema/data-flywheel.schema";

export async function handlePostWorkLike(request: Request): Promise<Response> {
  const originError = requireValidOrigin(request);
  if (originError) return originError;

  const auth = createAuth();
  if (!auth) return jsonResponse({ error: "Auth unavailable" }, 501);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return jsonResponse({ error: "Unauthorized" }, 401);
  const binding = getD1Binding();
  if (!binding) return jsonResponse({ error: "DB unavailable" }, 501);
  const db = getDb(binding);

  try {
    const { workId } = (await request.json()) as { workId: string };
    if (!workId) return jsonResponse({ error: "Missing workId" }, 400);
    const [targetWork] = await db
      .select({ id: work.id })
      .from(work)
      .where(and(eq(work.id, workId), eq(work.isPublished, 1)));
    if (!targetWork) return jsonResponse({ error: "Not found" }, 404);

    const [existing] = await db
      .select()
      .from(workLike)
      .where(and(eq(workLike.workId, workId), eq(workLike.userId, session.user.id)));

    if (existing) {
      await db.delete(workLike).where(eq(workLike.id, existing.id));
      await db
        .update(work)
        .set({ likeCount: sql`${work.likeCount} - 1` })
        .where(eq(work.id, workId));
      const [updated] = await db
        .select({ likeCount: work.likeCount })
        .from(work)
        .where(eq(work.id, workId));
      return jsonResponse({ liked: false, likeCount: updated?.likeCount ?? 0 }, 200);
    }

    await db.insert(workLike).values({
      id: crypto.randomUUID(),
      workId,
      userId: session.user.id,
      createdAt: Math.floor(Date.now() / 1000),
    });
    await db
      .update(work)
      .set({ likeCount: sql`${work.likeCount} + 1` })
      .where(eq(work.id, workId));
    const [updated] = await db
      .select({ likeCount: work.likeCount })
      .from(work)
      .where(eq(work.id, workId));
    return jsonResponse({ liked: true, likeCount: updated?.likeCount ?? 0 }, 200);
  } catch {
    return jsonResponse({ error: "Like failed" }, 500);
  }
}

export const Route = createFileRoute("/api/works/like")({
  server: {
    handlers: {
      POST: async ({ request }) => handlePostWorkLike(request),
    },
  },
});
