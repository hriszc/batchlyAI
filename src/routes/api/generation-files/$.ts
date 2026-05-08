import { createFileRoute } from "@tanstack/react-router";

import { createAuth } from "@/lib/auth/auth";

interface R2Binding {
  get(
    key: string,
  ): Promise<{ body: ReadableStream; writeHttpMetadata(headers: Headers): void } | null>;
}

export async function handleGenerationFile(
  request: Request,
  params: { _splat: string },
): Promise<Response> {
  const env = (globalThis as Record<string, unknown>).__env__ as
    | Record<string, unknown>
    | undefined;
  const r2 = env?.batchlyai_r2 as R2Binding | undefined;
  if (!r2) return new Response("R2 not available", { status: 501 });

  const key = params._splat;
  if (!key) return new Response("Not found", { status: 404 });

  // Require authentication
  const auth = createAuth();
  if (!auth) return new Response("Auth unavailable", { status: 501 });

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Verify the file belongs to this user
  // Key format: generations/{userId}/{generationId}/{index}.png
  const userId = session.user.id.replace(/[^a-zA-Z0-9_-]/g, "_");
  if (
    !key.startsWith(`generations/${userId}/`) &&
    !key.startsWith(`generations/${session.user.id}/`)
  ) {
    return new Response("Not found", { status: 404 });
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
        handleGenerationFile(request, params as { _splat: string }),
    },
  },
});
