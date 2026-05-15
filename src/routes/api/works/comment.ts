import { createFileRoute } from "@tanstack/react-router";
import { and, desc, eq, sql } from "drizzle-orm";

import { jsonResponse, requireValidOrigin } from "@/lib/api-helpers";
import { createAuth } from "@/lib/auth/auth";
import { getD1Binding } from "@/lib/cloudflare/bindings";
import { getDb } from "@/lib/db";
import { user } from "@/lib/db/schema/auth.schema";
import { work, workComment } from "@/lib/db/schema/data-flywheel.schema";

export async function handleGetWorkComments(request: Request): Promise<Response> {
  const binding = getD1Binding();
  if (!binding) return jsonResponse({ error: "DB unavailable" }, 501);
  const db = getDb(binding);

  const url = new URL(request.url);
  const workId = url.searchParams.get("workId") || "";
  if (!workId) return jsonResponse({ error: "Missing workId" }, 400);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
  const offset = parseInt(url.searchParams.get("offset") || "0");

  try {
    const rows = await db
      .select({ c: workComment, u: { name: user.name } })
      .from(workComment)
      .leftJoin(user, eq(workComment.userId, user.id))
      .where(eq(workComment.workId, workId))
      .orderBy(desc(workComment.createdAt))
      .limit(limit)
      .offset(offset);

    return jsonResponse(
      { comments: rows.map((r) => ({ ...r.c, userName: r.u?.name || "Anonymous" })) },
      200,
    );
  } catch {
    return jsonResponse({ error: "Failed" }, 500);
  }
}

export async function handlePostWorkComment(request: Request): Promise<Response> {
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
    const { workId, content } = (await request.json()) as { workId: string; content: string };
    if (!workId || !content?.trim()) return jsonResponse({ error: "Missing fields" }, 400);
    const trimmed = content.trim();
    if (trimmed.length > 1000) return jsonResponse({ error: "Comment too long" }, 400);

    const [targetWork] = await db
      .select({ id: work.id })
      .from(work)
      .where(and(eq(work.id, workId), eq(work.isPublished, 1)));
    if (!targetWork) return jsonResponse({ error: "Not found" }, 404);

    await db.insert(workComment).values({
      id: crypto.randomUUID(),
      workId,
      userId: session.user.id,
      content: trimmed,
      createdAt: Math.floor(Date.now() / 1000),
    });

    await db
      .update(work)
      .set({ commentCount: sql`${work.commentCount} + 1` })
      .where(eq(work.id, workId));

    return jsonResponse({ success: true }, 201);
  } catch {
    return jsonResponse({ error: "Failed" }, 500);
  }
}

export const Route = createFileRoute("/api/works/comment")({
  server: {
    handlers: {
      GET: async ({ request }) => handleGetWorkComments(request),
      POST: async ({ request }) => handlePostWorkComment(request),
    },
  },
});
