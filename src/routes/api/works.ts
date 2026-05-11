import { createFileRoute } from "@tanstack/react-router";
import { desc, eq, gte, and } from "drizzle-orm";

import { jsonResponse } from "@/lib/api-helpers";
import { createAuth } from "@/lib/auth/auth";
import { getD1Binding } from "@/lib/cloudflare/bindings";
import { mirrorImageToR2 } from "@/lib/cloudflare/r2";
import { getDb } from "@/lib/db";
import { work } from "@/lib/db/schema/data-flywheel.schema";

export async function handleGetWorks(request: Request): Promise<Response> {
  const binding = getD1Binding();
  if (!binding) return jsonResponse({ error: "DB unavailable" }, 501);
  const db = getDb(binding);

  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "new";
  const category = url.searchParams.get("category") || "";
  const userId = url.searchParams.get("userId") || "";
  const remixId = url.searchParams.get("remix") || "";
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10), 100);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);

  try {
    // Single work for remix
    if (remixId) {
      const [w] = await db.select().from(work).where(eq(work.id, remixId));
      if (!w) return jsonResponse({ error: "Not found" }, 404);
      return jsonResponse(
        {
          ...w,
          variableGroups: JSON.parse(w.variableGroups),
          resultUrls: JSON.parse(w.resultUrls),
        },
        200,
      );
    }

    const conditions = [eq(work.isPublished, 1)];
    if (category) conditions.push(eq(work.category, category));
    if (userId) conditions.push(eq(work.userId, userId));
    if (type === "hot") {
      const weekAgo = Math.floor(Date.now() / 1000) - 7 * 86400;
      conditions.push(gte(work.publishedAt, weekAgo));
    }

    const rows = await db
      .select()
      .from(work)
      .where(and(...conditions))
      .orderBy(desc(type === "hot" ? work.likeCount : work.createdAt))
      .limit(limit)
      .offset(offset);

    return jsonResponse(
      {
        works: rows.map((w) => ({
          ...w,
          variableGroups: JSON.parse(w.variableGroups),
          resultUrls: JSON.parse(w.resultUrls),
        })),
      },
      200,
    );
  } catch {
    return jsonResponse({ error: "Failed to fetch works" }, 500);
  }
}

export async function handlePostWork(request: Request): Promise<Response> {
  const auth = createAuth();
  if (!auth) return jsonResponse({ error: "Auth unavailable" }, 501);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return jsonResponse({ error: "Unauthorized" }, 401);

  const binding = getD1Binding();
  if (!binding) return jsonResponse({ error: "DB unavailable" }, 501);
  const db = getDb(binding);

  try {
    const body = (await request.json()) as {
      title: string;
      description?: string;
      category?: string;
      coverUrl: string;
      resultUrls: string[];
      promptTemplate: string;
      variableGroups: string;
      model: string;
      generationId?: string;
    };
    if (!body.title?.trim() || !body.coverUrl) {
      return jsonResponse({ error: "Title and cover image are required" }, 400);
    }

    const now = Math.floor(Date.now() / 1000);
    const id = crypto.randomUUID();
    const resultUrls = body.resultUrls.length
      ? await Promise.all(
          body.resultUrls.map((url, i) => mirrorImageToR2(url, `works/${id}/${i}.png`)),
        )
      : [];
    const coverUrl =
      resultUrls[body.resultUrls.indexOf(body.coverUrl)] ||
      resultUrls[0] ||
      (await mirrorImageToR2(body.coverUrl, `works/${id}/cover.png`));

    await db.insert(work).values({
      id,
      userId: session.user.id,
      title: body.title.trim(),
      description: body.description || null,
      category: body.category || null,
      coverUrl,
      resultUrls: JSON.stringify(resultUrls.length ? resultUrls : [coverUrl]),
      promptTemplate: body.promptTemplate,
      variableGroups: body.variableGroups || "{}",
      model: body.model,
      generationId: body.generationId || null,
      isPublished: 1,
      publishedAt: now,
      createdAt: now,
    });

    return jsonResponse({ id }, 201);
  } catch {
    return jsonResponse({ error: "Failed to publish work" }, 500);
  }
}

export const Route = createFileRoute("/api/works")({
  server: {
    handlers: {
      GET: async ({ request }) => handleGetWorks(request),
      POST: async ({ request }) => handlePostWork(request),
    },
  },
});
