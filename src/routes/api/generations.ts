import { createFileRoute } from "@tanstack/react-router";
import { desc, eq, sql } from "drizzle-orm";

import { jsonResponse } from "@/lib/api-helpers";
import { createAuth } from "@/lib/auth/auth";
import { getD1Binding } from "@/lib/cloudflare/bindings";
import { getDb } from "@/lib/db";
import { generation } from "@/lib/db/schema/data-flywheel.schema";

export async function handleGetGenerations(request: Request): Promise<Response> {
  const auth = createAuth();
  if (!auth) return jsonResponse({ error: "Auth unavailable" }, 501);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return jsonResponse({ error: "Unauthorized" }, 401);

  const binding = getD1Binding();
  if (!binding) return jsonResponse({ error: "DB unavailable" }, 501);
  const db = getDb(binding);

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10), 100);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);

  try {
    const [countRow] = await db
      .select({ count: sql<number>`COUNT(*)`.mapWith(Number) })
      .from(generation)
      .where(eq(generation.userId, session.user.id));

    const rows = await db
      .select()
      .from(generation)
      .where(eq(generation.userId, session.user.id))
      .orderBy(desc(generation.createdAt))
      .limit(limit)
      .offset(offset);

    return jsonResponse(
      {
        generations: rows.map((r) => ({
          ...r,
          resolvedPrompts: JSON.parse(r.resolvedPrompts),
          variableGroups: JSON.parse(r.variableGroups),
          resultUrls: JSON.parse(r.resultUrls),
        })),
        total: countRow?.count ?? 0,
      },
      200,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch generations";
    return jsonResponse({ error: message }, 500);
  }
}

export const Route = createFileRoute("/api/generations")({
  server: {
    handlers: {
      GET: async ({ request }) => handleGetGenerations(request),
    },
  },
});
