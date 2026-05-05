import { createFileRoute } from "@tanstack/react-router";

import { createAuth } from "@/lib/auth/auth";
import { uploadToR2 } from "@/lib/cloudflare/r2";

export const Route = createFileRoute("/api/upload-url")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = createAuth();
        if (!auth) {
          return new Response(JSON.stringify({ error: "Auth unavailable" }), {
            status: 501,
            headers: { "Content-Type": "application/json" },
          });
        }

        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user?.id) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const contentDisposition = request.headers.get("x-file-name") || "";
        const filename = decodeURIComponent(contentDisposition) || "upload";

        const userId = session.user.id;
        const key = `uploads/${userId}/${Date.now()}_${filename}`;

        const result = await uploadToR2(key, request.body!);

        if (!result.success) {
          return new Response(JSON.stringify({ error: "R2 not configured" }), {
            status: 501,
            headers: { "Content-Type": "application/json" },
          });
        }

        const proxyUrl = `${new URL(request.url).origin}/api/files/${key}`;

        return new Response(JSON.stringify({ publicUrl: proxyUrl, key }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
