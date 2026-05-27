import { createFileRoute } from "@tanstack/react-router";
import { and, desc, eq, gte } from "drizzle-orm";

import { assertImageUrlsSafe, CONTENT_SAFETY_BLOCK_MESSAGE } from "@/lib/ai/nsfw";
import { jsonResponse, requireValidOrigin } from "@/lib/api-helpers";
import { createAuth } from "@/lib/auth/auth";
import { getD1Binding } from "@/lib/cloudflare/bindings";
import { mirrorImageToR2 } from "@/lib/cloudflare/r2";
import { getDb } from "@/lib/db";
import { work } from "@/lib/db/schema/data-flywheel.schema";
import { generateExploreMetadata } from "@/lib/explore-metadata";
import { isIndexableWork } from "@/lib/works/quality";

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
      const [w] = await db
        .select()
        .from(work)
        .where(and(eq(work.id, remixId), eq(work.isPublished, 1)));
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

    const works = rows.map((w) => ({
      ...w,
      variableGroups: JSON.parse(w.variableGroups),
      resultUrls: JSON.parse(w.resultUrls),
    }));
    const publicWorks = userId ? works : works.filter((item) => isIndexableWork(item));

    return jsonResponse(
      {
        works: publicWorks.map((w) => ({
          ...w,
        })),
      },
      200,
    );
  } catch {
    return jsonResponse({ error: "Failed to fetch works" }, 500);
  }
}

export async function handlePostWork(request: Request): Promise<Response> {
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
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      category?: string;
      coverUrl: string;
      resultUrls?: string[];
      promptTemplate: string;
      originalPromptTemplate?: string | null;
      variableGroups: string;
      model: string;
      aspectRatio?: string;
      generationId?: string;
    };
    if (!body.coverUrl) {
      return jsonResponse({ error: "Cover image is required" }, 400);
    }
    if (!body.promptTemplate?.trim() || !body.model?.trim()) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }
    if (body.promptTemplate.length > 5000) {
      return jsonResponse({ error: "Prompt template too long" }, 400);
    }
    if (body.originalPromptTemplate && body.originalPromptTemplate.length > 5000) {
      return jsonResponse({ error: "Original prompt template too long" }, 400);
    }
    if (body.resultUrls && body.resultUrls.length > 20) {
      return jsonResponse({ error: "Too many result URLs" }, 400);
    }
    await assertImageUrlsSafe([body.coverUrl, ...(body.resultUrls ?? [])]);

    const now = Math.floor(Date.now() / 1000);
    const id = crypto.randomUUID();
    const originalPromptTemplate = body.originalPromptTemplate?.trim() || null;
    const coverIndex = body.resultUrls?.indexOf(body.coverUrl) ?? -1;
    const resultUrls = body.resultUrls?.length
      ? await Promise.all(
          body.resultUrls.map((url, i) => mirrorImageToR2(url, `works/${id}/${i}.png`)),
        )
      : [];
    const coverUrl =
      resultUrls[coverIndex] ||
      resultUrls[0] ||
      (await mirrorImageToR2(body.coverUrl, `works/${id}/cover.png`));
    const metadata = await generateExploreMetadata({
      prompt: originalPromptTemplate || body.promptTemplate,
      model: body.model,
      aspectRatio: body.aspectRatio,
      title: body.title,
      description: body.description,
      category: body.category,
      resultUrls: resultUrls.length ? resultUrls : [coverUrl],
      coverUrl,
    });

    await db.insert(work).values({
      id,
      userId: session.user.id,
      title: metadata.name,
      description: metadata.description,
      useCase: metadata.useCase,
      category: metadata.category,
      coverUrl,
      resultUrls: JSON.stringify(resultUrls.length ? resultUrls : [coverUrl]),
      promptTemplate: body.promptTemplate,
      originalPromptTemplate,
      variableGroups: body.variableGroups || "{}",
      model: body.model,
      generationId: body.generationId || null,
      isPublished: 1,
      publishedAt: now,
      createdAt: now,
    });

    return jsonResponse(
      {
        id,
        title: metadata.name,
        description: metadata.description,
        useCase: metadata.useCase,
        category: metadata.category,
        coverUrl,
        resultUrls: resultUrls.length ? resultUrls : [coverUrl],
      },
      201,
    );
  } catch (err) {
    if (err instanceof Error && err.message === CONTENT_SAFETY_BLOCK_MESSAGE) {
      return jsonResponse({ error: CONTENT_SAFETY_BLOCK_MESSAGE }, 400);
    }
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
