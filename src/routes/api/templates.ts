import { createFileRoute } from "@tanstack/react-router";
import { and, desc, eq, like, or, sql } from "drizzle-orm";

import { jsonResponse } from "@/lib/api-helpers";
import { createAuth } from "@/lib/auth/auth";
import { getDb } from "@/lib/db";
import { template as templateTable } from "@/lib/db/schema";

function getD1Binding(): D1Database | undefined {
  const platformEnv = (globalThis as Record<string, unknown>).__env__ as
    | Record<string, unknown>
    | undefined;
  return platformEnv?.batchlyai_db as D1Database | undefined;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export const Route = createFileRoute("/api/templates")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const binding = getD1Binding();
        if (!binding) return jsonResponse({ error: "DB unavailable" }, 501);
        const db = getDb(binding);

        const url = new URL(request.url);
        const category = url.searchParams.get("category") || "";
        const search = url.searchParams.get("search") || "";
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50);
        const offset = parseInt(url.searchParams.get("offset") || "0");

        let query = db
          .select()
          .from(templateTable)
          .where(eq(templateTable.isPublic, true))
          .$dynamic();

        if (category) {
          query = query.where(eq(templateTable.category, category));
        }

        if (search) {
          query = query.where(
            or(
              like(templateTable.name, `%${search}%`),
              like(templateTable.description, `%${search}%`),
            ),
          );
        }

        const rows = await query
          .orderBy(desc(templateTable.usageCount), desc(templateTable.createdAt))
          .limit(limit)
          .offset(offset);

        // Count separately
        let countQuery = db
          .select({ total: sql<number>`COUNT(*)`.mapWith(Number) })
          .from(templateTable)
          .where(eq(templateTable.isPublic, true))
          .$dynamic();

        if (category) {
          countQuery = countQuery.where(eq(templateTable.category, category));
        }
        if (search) {
          countQuery = countQuery.where(
            or(
              like(templateTable.name, `%${search}%`),
              like(templateTable.description, `%${search}%`),
            ),
          );
        }
        const [countResult] = await countQuery;

        const parsed = rows.map((r) => ({
          ...r,
          variableGroups: JSON.parse(r.variableGroups),
        }));

        return jsonResponse(
          { templates: parsed, total: countResult?.total ?? 0 },
          200,
        );
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
          description?: string;
          category?: string;
          promptTemplate?: string;
          variableGroups?: unknown;
          model?: string;
          aspectRatio?: string;
          previewImageUrl?: string;
        };

        if (!body.name || !body.promptTemplate || !body.variableGroups) {
          return jsonResponse(
            { error: "Missing required fields: name, promptTemplate, variableGroups" },
            400,
          );
        }

        if (!body.promptTemplate.includes("{{")) {
          return jsonResponse(
            { error: "Prompt template must contain at least one {{variable}} marker" },
            400,
          );
        }

        const binding = getD1Binding();
        if (!binding) return jsonResponse({ error: "DB unavailable" }, 501);
        const db = getDb(binding);

        const baseSlug = slugify(body.name);
        let slug = baseSlug;
        let attempt = 0;
        while (true) {
          const [existing] = await db
            .select({ id: templateTable.id })
            .from(templateTable)
            .where(eq(templateTable.slug, slug));
          if (!existing) break;
          attempt++;
          slug = `${baseSlug}-${attempt}`;
        }

        const id = `tmpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const now = Math.floor(Date.now() / 1000);

        await db.insert(templateTable).values({
          id,
          userId: session.user.id,
          slug,
          name: body.name,
          description: body.description || "",
          category: body.category || "general",
          promptTemplate: body.promptTemplate,
          variableGroups: JSON.stringify(body.variableGroups),
          model: body.model || "z-image-pro",
          aspectRatio: body.aspectRatio || "9:16",
          previewImageUrl: body.previewImageUrl || null,
          isPublic: true,
          createdAt: now,
        });

        const origin = new URL(request.url).origin;
        return jsonResponse(
          { id, slug, url: `${origin}/templates/${slug}` },
          201,
        );
      },
    },
  },
});
