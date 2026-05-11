import { createFileRoute } from "@tanstack/react-router";
import { desc, eq, like, or, sql } from "drizzle-orm";

import { jsonResponse } from "@/lib/api-helpers";
import { createAuth } from "@/lib/auth/auth";
import { getD1Binding } from "@/lib/cloudflare/bindings";
import { getDb } from "@/lib/db";
import { template as templateTable } from "@/lib/db/schema";
import { generateExploreMetadata } from "@/lib/explore-metadata";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export async function handleGetTemplates(request: Request): Promise<Response> {
  const binding = getD1Binding();
  if (!binding) return jsonResponse({ error: "DB unavailable" }, 501);
  const db = getDb(binding);

  const url = new URL(request.url);
  const category = url.searchParams.get("category") || "";
  const search = url.searchParams.get("search") || "";
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50);
  const offset = parseInt(url.searchParams.get("offset") || "0");

  let query = db.select().from(templateTable).where(eq(templateTable.isPublic, true)).$dynamic();

  if (category) {
    query = query.where(eq(templateTable.category, category));
  }

  if (search) {
    query = query.where(
      or(like(templateTable.name, `%${search}%`), like(templateTable.description, `%${search}%`)),
    );
  }

  const rows = await query
    .orderBy(desc(templateTable.usageCount), desc(templateTable.createdAt))
    .limit(limit)
    .offset(offset);

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
      or(like(templateTable.name, `%${search}%`), like(templateTable.description, `%${search}%`)),
    );
  }
  const [countResult] = await countQuery;

  const parsed = rows.map((r) => ({
    ...r,
    variableGroups: JSON.parse(r.variableGroups),
  }));

  return jsonResponse({ templates: parsed, total: countResult?.total ?? 0 }, 200);
}

export async function handlePostTemplate(request: Request): Promise<Response> {
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
    coverUrl?: string;
    resultUrls?: string[];
  };

  if (!body.promptTemplate || !body.variableGroups) {
    return jsonResponse({ error: "Missing required fields: promptTemplate, variableGroups" }, 400);
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

  const metadata = await generateExploreMetadata({
    prompt: body.promptTemplate,
    model: body.model,
    aspectRatio: body.aspectRatio,
    name: body.name,
    description: body.description,
    category: body.category,
    previewImageUrl: body.previewImageUrl,
    coverUrl: body.coverUrl,
    resultUrls: body.resultUrls,
  });
  const variableGroups =
    typeof body.variableGroups === "string"
      ? body.variableGroups
      : JSON.stringify(body.variableGroups);

  const baseSlug = slugify(metadata.name) || `template-${Date.now()}`;
  let slug = baseSlug;
  let attempt = 0;
  const maxAttempts = 20;
  while (attempt <= maxAttempts) {
    const [existing] = await db
      .select({ id: templateTable.id })
      .from(templateTable)
      .where(eq(templateTable.slug, slug));
    if (!existing) break;
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }
  if (attempt > maxAttempts) {
    return jsonResponse({ error: "Could not generate unique slug" }, 409);
  }

  const id = `tmpl_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const now = Math.floor(Date.now() / 1000);

  await db.insert(templateTable).values({
    id,
    userId: session.user.id,
    slug,
    name: metadata.name,
    description: metadata.description,
    category: metadata.category,
    promptTemplate: body.promptTemplate,
    variableGroups,
    model: body.model || "z-image-pro",
    aspectRatio: body.aspectRatio || "9:16",
    previewImageUrl: metadata.previewImageUrl,
    isPublic: true,
    createdAt: now,
  });

  const origin = new URL(request.url).origin;
  return jsonResponse(
    { id, slug, url: `${origin}/templates/${slug}`, previewImageUrl: metadata.previewImageUrl },
    201,
  );
}

export const Route = createFileRoute("/api/templates")({
  server: {
    handlers: {
      GET: async ({ request }) => handleGetTemplates(request),
      POST: async ({ request }) => handlePostTemplate(request),
    },
  },
});
