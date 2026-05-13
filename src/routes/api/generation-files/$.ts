import { createFileRoute } from "@tanstack/react-router";
import { and, eq, like, or } from "drizzle-orm";

import { createAuth } from "@/lib/auth/auth";
import { getD1Binding } from "@/lib/cloudflare/bindings";
import { getDb } from "@/lib/db";
import { work } from "@/lib/db/schema/data-flywheel.schema";

interface R2Binding {
  get(
    key: string,
  ): Promise<{ body: ReadableStream; writeHttpMetadata(headers: Headers): void } | null>;
}

async function isPublishedWorkFile(fileUrl: string): Promise<boolean> {
  try {
    const binding = getD1Binding();
    if (!binding) return false;

    const db = getDb(binding);
    const [row] = await db
      .select({ id: work.id })
      .from(work)
      .where(
        and(
          eq(work.isPublished, 1),
          or(eq(work.coverUrl, fileUrl), like(work.resultUrls, `%${fileUrl}%`)),
        ),
      )
      .limit(1);
    return !!row;
  } catch (err) {
    console.error("[generation-files] published work lookup failed:", err);
    return false;
  }
}

export async function handleGenerationFile(
  request: Request,
  params: { _splat?: string; _?: string; "*"?: string },
): Promise<Response> {
  const env = (globalThis as Record<string, unknown>).__env__ as
    | Record<string, unknown>
    | undefined;
  const r2 = env?.batchlyai_r2 as R2Binding | undefined;
  if (!r2) return new Response("R2 not available", { status: 501 });

  const key = params._splat ?? params._ ?? params["*"];
  if (!key) return new Response("Not found", { status: 404 });

  const publicWorkFile =
    key.startsWith("works/") ||
    (!key.startsWith("generations/") &&
      (await isPublishedWorkFile(`/api/generation-files/${key}`)));

  if (!publicWorkFile) {
    // Require authentication for private generation history files.
    const auth = createAuth();
    if (!auth) return new Response("Auth unavailable", { status: 501 });

    let session: { user?: { id?: string } } | null;
    try {
      session = await auth.api.getSession({ headers: request.headers });
    } catch (err) {
      console.error("[generation-files] session lookup failed:", err);
      return new Response("Unauthorized", { status: 401 });
    }
    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Verify the file belongs to this user.
    // Key format: generations/{userId}/{generationId}/{index}.png
    const userId = session.user.id.replace(/[^a-zA-Z0-9_-]/g, "_");
    if (
      !key.startsWith(`generations/${userId}/`) &&
      !key.startsWith(`generations/${session.user.id}/`)
    ) {
      return new Response("Not found", { status: 404 });
    }
  }

  try {
    const obj = await r2.get(key);
    if (!obj) return new Response("Not found", { status: 404 });

    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("X-Content-Type-Options", "nosniff");

    return new Response(obj.body, { headers });
  } catch {
    return new Response("Error reading file", { status: 500 });
  }
}

export const Route = createFileRoute("/api/generation-files/$")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        handleGenerationFile(request, params as { _splat?: string; _?: string; "*"?: string }),
    },
  },
});
