import { createFileRoute } from "@tanstack/react-router";

import { createAuth } from "@/lib/auth/auth";

interface R2Binding {
  get(
    key: string,
  ): Promise<{ body: ReadableStream; writeHttpMetadata(headers: Headers): void } | null>;
}

export const Route = createFileRoute("/api/files/$")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const env = (globalThis as Record<string, unknown>).__env__ as
          | Record<string, unknown>
          | undefined;
        const r2 = env?.batchlyai_r2 as R2Binding | undefined;
        if (!r2) return new Response("R2 not available", { status: 501 });

        const key = (params as { _splat: string })._splat;
        if (!key) return new Response("Not found", { status: 404 });

        const auth = createAuth();
        if (!auth) return new Response("Auth not available", { status: 500 });

        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return new Response("Unauthorized", { status: 401 });
        }

        if (!key.startsWith(`uploads/${session.user.id}/`)) {
          return new Response("Not found", { status: 404 });
        }

        try {
          const obj = await r2.get(key);
          if (!obj) return new Response("Not found", { status: 404 });

          const headers = new Headers();
          obj.writeHttpMetadata(headers);
          headers.set("Cache-Control", "private, max-age=86400");
          return new Response(obj.body, { headers });
        } catch {
          return new Response("Error reading file", { status: 500 });
        }
      },
    },
  },
});
