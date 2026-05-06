import { createFileRoute } from "@tanstack/react-router";

import { jsonResponse } from "@/lib/api-helpers";
import { createAuth } from "@/lib/auth/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { processReferralAfterSignup } from "@/lib/referral/process";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const auth = createAuth();
          if (!auth) return dbUnavailable();
          return auth.handler(request);
        } catch (err) {
          console.error("[auth] GET handler error:", err);
          return jsonResponse({ error: "Internal server error" }, 500);
        }
      },
      POST: async ({ request }) => {
        try {
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
              return jsonResponse({ error: "Too many requests" }, 429);
            }
          }

          const response = await auth.handler(request);

          // Post-signup referral processing
          if (path === "sign-up/email" && response.ok) {
            try {
              const cloned = response.clone();
              const body = (await cloned.json()) as {
                user?: { id: string; email: string };
              };
              await processReferralAfterSignup(request, body);
            } catch {
              console.error("[auth] Referral processing error");
            }
          }

          return response;
        } catch (err) {
          console.error("[auth] POST handler error:", err);
          return jsonResponse({ error: "Internal server error" }, 500);
        }
      },
    },
  },
});

function dbUnavailable() {
  return jsonResponse({ error: "Database not available" }, 501);
}
