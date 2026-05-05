import { createFileRoute } from "@tanstack/react-router";

import { jsonResponse } from "@/lib/api-helpers";
import { createAuth } from "@/lib/auth/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { processReferralAfterSignup } from "@/lib/referral/process";

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
      },
    },
  },
});

function dbUnavailable() {
  return jsonResponse({ error: "Database not available" }, 501);
}

export function getApiMethod(
  auth: { api: Record<string, unknown> },
  path: string,
): { method: string; params?: Record<string, string> } | undefined {
  const API_MAP: Record<string, { method: string; paramKey?: string }> = {
    "sign-up/email": { method: "signUpEmail" },
    "sign-in/email": { method: "signInEmail" },
    "sign-in/social": { method: "signInSocial" },
    "sign-out": { method: "signOut" },
    "get-session": { method: "getSession" },
    "forget-password": { method: "forgetPassword" },
    "reset-password": { method: "resetPassword" },
    "verify-email": { method: "verifyEmail" },
    "send-verification-email": { method: "sendVerificationEmail" },
  };

  const exact = API_MAP[path];
  if (exact) {
    return { method: exact.method };
  }

  const callbackMatch = path.match(/^callback\/(.+)$/);
  if (callbackMatch) {
    return { method: "callbackOAuth", params: { id: callbackMatch[1] } };
  }

  return undefined;
}
