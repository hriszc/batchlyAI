import { createFileRoute } from "@tanstack/react-router";
import { desc, eq, sql } from "drizzle-orm";

import { jsonResponse } from "@/lib/api-helpers";
import { createAuth } from "@/lib/auth/auth";
import { getDb } from "@/lib/db";
import { generation } from "@/lib/db/schema/data-flywheel.schema";

function getD1Binding(): D1Database | undefined {
  const platformEnv = (globalThis as Record<string, unknown>).__env__ as
    | Record<string, unknown>
    | undefined;
  return platformEnv?.batchlyai_db as D1Database | undefined;
}

function dbUnavailable() {
  return jsonResponse({ error: "Database not available" }, 501);
}

export async function handleGetGenerations(request: Request): Promise<Response> {
  const auth = createAuth();
  if (!auth) return dbUnavailable();

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const binding = getD1Binding();
  if (!binding) return dbUnavailable();

  const db = getDb(binding);

  try {
    const url = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "20", 10), 1), 100);
    const offset = Math.max(parseInt(url.searchParams.get("offset") || "0", 10), 0);

    const userId = session.user.id;

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(generation)
        .where(eq(generation.userId, userId))
        .orderBy(desc(generation.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(generation)
        .where(eq(generation.userId, userId)),
    ]);

    const total = countResult[0]?.count ?? 0;

    const generations = rows.map((row) => ({
      id: row.id,
      promptTemplate: row.promptTemplate,
      resolvedPrompts: JSON.parse(row.resolvedPrompts) as string[],
      variableGroups: JSON.parse(row.variableGroups) as Array<{ values: string[] }>,
      resultUrls: JSON.parse(row.resultUrls) as string[],
      model: row.model,
      creditsUsed: row.creditsUsed,
      createdAt: row.createdAt,
    }));

    return jsonResponse({ generations, total }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
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
