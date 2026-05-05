import { createFileRoute } from "@tanstack/react-router";

import { createAuth } from "@/lib/auth/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = createAuth();
        if (!auth) return dbUnavailable();
        return auth.handler(request);
      },
      POST: async ({ request }) => {
        const auth = createAuth();
        if (!auth) return dbUnavailable();

        // Rate limit sensitive endpoints
        const url = new URL(request.url);
        const path = url.pathname.replace("/api/auth/", "");
        const SENSITIVE_PATHS = [
          "sign-in/email",
          "sign-up/email",
          "forget-password",
          "reset-password",
        ];
        if (SENSITIVE_PATHS.includes(path)) {
          const ip = request.headers.get("CF-Connecting-IP") || "unknown";
          const { allowed } = checkRateLimit(`${path}:${ip}`, 10, 60);
          if (!allowed) {
            return new Response(JSON.stringify({ error: "Too many requests" }), {
              status: 429,
              headers: { "Content-Type": "application/json" },
            });
          }
        }

        return auth.handler(request);
      },
    },
  },
});

function dbUnavailable() {
  return new Response(JSON.stringify({ error: "Database not available" }), {
    status: 501,
    headers: { "Content-Type": "application/json" },
  });
}
