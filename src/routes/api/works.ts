import { createFileRoute } from "@tanstack/react-router";
import { desc, eq, gte, sql } from "drizzle-orm";

import { jsonResponse } from "@/lib/api-helpers";
import { createAuth } from "@/lib/auth/auth";
import { getDb } from "@/lib/db";
import { work as workTable } from "@/lib/db/schema";

const VALID_CATEGORIES = ["ecommerce", "art", "social-media", "marketing", "other"];

function getD1Binding(): D1Database | undefined {
  const platformEnv = (globalThis as Record<string, unknown>).__env__ as
    | Record<string, unknown>
    | undefined;
  return platformEnv?.batchlyai_db as D1Database | undefined;
}

function dbUnavailable() {
  return jsonResponse({ error: "Database not available" }, 501);
}

export const Route = createFileRoute("/api/works")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const binding = getD1Binding();
        if (!binding) return dbUnavailable();
        const db = getDb(binding);

        const url = new URL(request.url);
        const type = url.searchParams.get("type") || "new";
        const category = url.searchParams.get("category") || "";
        const userId = url.searchParams.get("userId") || "";
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50);
        const offset = parseInt(url.searchParams.get("offset") || "0");

        let query = db
          .select()
          .from(workTable)
          .where(eq(workTable.isPublished, true))
          .$dynamic();

        if (category) {
          query = query.where(eq(workTable.category, category));
        }
        if (userId) {
          query = query.where(eq(workTable.userId, userId));
        }

        if (type === "hot") {
          // Within last 7 days, ordered by like_count desc
          const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
          query = query
            .where(gte(workTable.publishedAt, sevenDaysAgo))
            .orderBy(desc(workTable.likeCount), desc(workTable.createdAt));
        } else {
          // "new" - ordered by created_at desc
          query = query.orderBy(desc(workTable.createdAt));
        }

        const rows = await query.limit(limit).offset(offset);

        // Count total
        let countQuery = db
          .select({ total: sql<number>`COUNT(*)`.mapWith(Number) })
          .from(workTable)
          .where(eq(workTable.isPublished, true))
          .$dynamic();

        if (category) {
          countQuery = countQuery.where(eq(workTable.category, category));
        }
        if (userId) {
          countQuery = countQuery.where(eq(workTable.userId, userId));
        }

        const [countResult] = await countQuery;

        const parsed = rows.map((r) => ({
          ...r,
          variableGroups: JSON.parse(r.variableGroups),
          resultUrls: JSON.parse(r.resultUrls),
        }));

        return jsonResponse({ works: parsed, total: countResult?.total ?? 0 }, 200);
      },
      POST: async ({ request }) => {
        const auth = createAuth();
        if (!auth) return dbUnavailable();

        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user?.id) {
          return jsonResponse({ error: "Unauthorized" }, 401);
        }

        const body = (await request.json()) as {
          generationId?: string;
          title?: string;
          description?: string;
          category?: string;
          coverUrl?: string;
          resultUrls?: string[];
          promptTemplate?: string;
          variableGroups?: unknown;
          model?: string;
        };

        if (!body.title) {
          return jsonResponse({ error: "Missing required field: title" }, 400);
        }
        if (!body.coverUrl) {
          return jsonResponse({ error: "Missing required field: coverUrl" }, 400);
        }
        if (!body.resultUrls || body.resultUrls.length === 0) {
          return jsonResponse({ error: "Missing required field: resultUrls" }, 400);
        }
        if (!body.promptTemplate) {
          return jsonResponse({ error: "Missing required field: promptTemplate" }, 400);
        }

        const binding = getD1Binding();
        if (!binding) return dbUnavailable();
        const db = getDb(binding);

        const id = `work_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const now = Math.floor(Date.now() / 1000);

        if (body.category && !VALID_CATEGORIES.includes(body.category)) {
          return jsonResponse(
            {
              error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}`,
            },
            400,
          );
        }

        await db.insert(workTable).values({
          id,
          userId: session.user.id,
          generationId: body.generationId || null,
          title: body.title,
          description: body.description || "",
          category: body.category || "other",
          coverUrl: body.coverUrl,
          resultUrls: JSON.stringify(body.resultUrls),
          promptTemplate: body.promptTemplate,
          variableGroups: JSON.stringify(body.variableGroups || []),
          model: body.model || "z-image-pro",
          isPublished: true,
          publishedAt: now,
          createdAt: now,
        });

        return jsonResponse({ id }, 201);
      },
    },
  },
});
