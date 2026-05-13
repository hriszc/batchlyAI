import { createFileRoute } from "@tanstack/react-router";
import { desc, eq, sql } from "drizzle-orm";

import { jsonResponse } from "@/lib/api-helpers";
import { createAuth } from "@/lib/auth/auth";
import { getD1Binding } from "@/lib/cloudflare/bindings";
import { mirrorImageToR2 } from "@/lib/cloudflare/r2";
import { getDb } from "@/lib/db";
import { generation } from "@/lib/db/schema/data-flywheel.schema";

function parseJsonArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function shouldMirrorGenerationUrl(url: string): boolean {
  return (
    /^https?:\/\//.test(url) &&
    !url.includes("/api/generation-files/") &&
    !url.includes("/api/files/")
  );
}

function safePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

async function ensureGenerationUrlsAreDurable(input: {
  db: ReturnType<typeof getDb>;
  userId: string;
  generationId: string;
  urls: string[];
}): Promise<string[]> {
  if (!input.urls.some(shouldMirrorGenerationUrl)) return input.urls;

  const sanitizedUserId = safePathSegment(input.userId);
  const durableUrls = await Promise.all(
    input.urls.map((url, index) =>
      shouldMirrorGenerationUrl(url)
        ? mirrorImageToR2(url, `generations/${sanitizedUserId}/${input.generationId}/${index}.png`)
        : Promise.resolve(url),
    ),
  );

  if (durableUrls.some((url, index) => url !== input.urls[index])) {
    await input.db
      .update(generation)
      .set({ resultUrls: JSON.stringify(durableUrls) })
      .where(eq(generation.id, input.generationId));
  }

  return durableUrls;
}

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

    const generations = await Promise.all(
      rows.map(async (r) => {
        const resultUrls = parseJsonArray(r.resultUrls);
        return {
          ...r,
          resolvedPrompts: JSON.parse(r.resolvedPrompts),
          variableGroups: JSON.parse(r.variableGroups),
          resultUrls: await ensureGenerationUrlsAreDurable({
            db,
            userId: session.user.id,
            generationId: r.id,
            urls: resultUrls,
          }),
        };
      }),
    );

    return jsonResponse({ generations, total: countRow?.count ?? 0 }, 200);
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
