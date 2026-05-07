import { createFileRoute } from "@tanstack/react-router";

import { jsonResponse } from "@/lib/api-helpers";
import { createAuth } from "@/lib/auth/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { processReferralAfterSignup } from "@/lib/referral/process";

type ApiMethod = (ctx: {
  body: unknown;
  headers: Headers;
  request: Request;
  asResponse: true;
}) => Promise<Response>;

// Map URL paths to Better Auth internal API methods.
// auth.handler() is too CPU-heavy for Workers Free (10ms limit).
// We bypass it and call auth.api directly instead.
const API_MAP: Record<string, string> = {
  "sign-up/email": "signUpEmail",
  "sign-in/email": "signInEmail",
  "sign-out": "signOut",
  "get-session": "getSession",
  "forget-password": "requestPasswordReset",
  "reset-password": "resetPassword",
  "send-verification-email": "sendVerificationEmail",
  "verify-email": "verifyEmail",
};

function dbUnavailable() {
  return jsonResponse({ error: "Database not available" }, 501);
}

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

          const url = new URL(request.url);
          const path = url.pathname.replace("/api/auth/", "");

          // Rate limit sensitive endpoints
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

          // Direct API call — bypass auth.handler() to avoid CPU timeout
          const methodName = API_MAP[path];
          if (methodName) {
            const apiMethod = (auth.api as Record<string, ApiMethod | undefined>)[methodName];
            if (apiMethod) {
              const body = await request
                .clone()
                .json()
                .catch(() => ({}));
              const response = await apiMethod.call(auth.api, {
                body,
                headers: request.headers,
                request,
                asResponse: true,
              });

              // Post-signup referral processing
              if (path === "sign-up/email" && response.ok) {
                try {
                  const cloned = response.clone();
                  const body = (await cloned.json()) as {
                    user?: { id: string; email: string };
                  };
                  await processReferralAfterSignup(request, body);

                  const refCode = (
                    (await request
                      .clone()
                      .json()
                      .catch(() => ({}))) as Record<string, unknown>
                  )?.ref as string | undefined;
                  const { trackServer } = await import("@/lib/analytics/server");
                  await trackServer("signup_completed", body.user?.id || "unknown", {
                    method: "email",
                    referral_code: refCode || "",
                  });
                } catch {
                  console.error("[auth] Referral processing error");
                }
              }

              return response;
            }
          }

          // Fallback to handler for unknown paths
          return auth.handler(request);
        } catch (err) {
          console.error("[auth] POST handler error:", err);
          return jsonResponse({ error: "Internal server error" }, 500);
        }
      },
    },
  },
});
