import { createFileRoute } from "@tanstack/react-router";
import { eq, desc, sql } from "drizzle-orm";

import { jsonResponse } from "@/lib/api-helpers";
import { createAuth } from "@/lib/auth/auth";
import { getDb } from "@/lib/db";
import { workComment, work } from "@/lib/db/schema/data-flywheel.schema";
import { user } from "@/lib/db/schema/auth.schema";

function getD1Binding(): D1Database | undefined {
  const platformEnv = (globalThis as Record<string, unknown>).__env__ as Record<string, unknown> | undefined;
  return platformEnv?.batchlyai_db as D1Database | undefined;
}

export const Route = createFileRoute("/api/works/comment")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const binding = getD1Binding();
        if (\!binding) return jsonResponse({ error: "DB unavailable" }, 501);
        const db = getDb(binding);
        const url = new URL(request.url);
        const workId = url.searchParams.get("workId") || "";
        if (\!workId) return jsonResponse({ error: "Missing workId" }, 400);
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
        const offset = parseInt(url.searchParams.get("offset") || "0");
        try {
          const rows = await db
            .select({ c: workComment, u: { name: user.name } })
            .from(workComment)
            .leftJoin(user, eq(workComment.userId, user.id))
            .where(eq(workComment.workId, workId))
            .orderBy(desc(workComment.createdAt))
            .limit(limit).offset(offset);
          return jsonResponse({ comments: rows.map(r => ({ ...r.c, userName: r.u?.name || "Anonymous" })) }, 200);
        } catch { return jsonResponse({ error: "Failed" }, 500); }
      },
      POST: async ({ request }) => {
        const auth = createAuth();
        if (\!auth) return jsonResponse({ error: "Auth unavailable" }, 501);
        const session = await auth.api.getSession({ headers: request.headers });
        if (\!session?.user?.id) return jsonResponse({ error: "Unauthorized" }, 401);
        const binding = getD1Binding();
        if (\!binding) return jsonResponse({ error: "DB unavailable" }, 501);
        const db = getDb(binding);
        try {
          const { workId, content } = (await request.json()) as { workId: string; content: string };
          if (\!workId || \!content?.trim()) return jsonResponse({ error: "Missing fields" }, 400);
          await db.insert(workComment).values({ id: crypto.randomUUID(), workId, userId: session.user.id, content: content.trim(), createdAt: Math.floor(Date.now() / 1000) });
          await db.update(work).set({ commentCount: sql`${work.commentCount} + 1` }).where(eq(work.id, workId));
          return jsonResponse({ success: true }, 201);
        } catch { return jsonResponse({ error: "Failed" }, 500); }
      },
    },
  },
});
