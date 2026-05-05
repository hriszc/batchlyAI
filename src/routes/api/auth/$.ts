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
            // Non-fatal: don't break signup if referral processing fails
            console.error("[auth] Referral processing error");
          }
        }

        return response;
      },
    },
  },
});

export function getApiMethod(auth: NonNullable<ReturnType<typeof createAuth>>, path: string) {
  switch (path) {
    case "sign-up/email":
      return { method: auth.api.signUpEmail };
    case "sign-in/email":
      return { method: auth.api.signInEmail };
    case "sign-in/social":
      return { method: auth.api.signInSocial };
    case "sign-out":
      return { method: auth.api.signOut };
    case "get-session":
      return { method: auth.api.getSession };
    case "forget-password":
      return { method: auth.api.forgetPassword };
    case "reset-password":
      return { method: auth.api.resetPassword };
    case "verify-email":
      return { method: auth.api.verifyEmail };
    case "send-verification-email":
      return { method: auth.api.sendVerificationEmail };
    default: {
      const callbackMatch = path.match(/^callback\/(.+)$/);
      if (callbackMatch) {
        return { method: auth.api.callbackOAuth, params: { id: callbackMatch[1] } };
      }
      return undefined;
    }
  }
}

function dbUnavailable() {
  return jsonResponse({ error: "Database not available" }, 501);
}
