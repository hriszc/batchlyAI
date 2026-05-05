import { createFileRoute } from "@tanstack/react-router";

import { createAuth } from "@/lib/auth/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = createAuth();
        if (!auth) return dbUnavailable();

        const url = new URL(request.url);
        const path = url.pathname.replace("/api/auth/", "");
        return callApi(auth, path, request, "GET");
      },
      POST: async ({ request }) => {
        const auth = createAuth();
        if (!auth) return dbUnavailable();

        const url = new URL(request.url);
        const path = url.pathname.replace("/api/auth/", "");
        return callApi(auth, path, request, "POST");
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
      // OAuth callback: /callback/:provider
      const callbackMatch = path.match(/^callback\/(.+)$/);
      if (callbackMatch) {
        return { method: auth.api.callbackOAuth, params: { id: callbackMatch[1] } };
      }
      return undefined;
    }
  }
}

async function callApi(
  auth: NonNullable<ReturnType<typeof createAuth>>,
  path: string,
  request: Request,
  _method: string,
) {
  const resolved = getApiMethod(auth, path);
  if (!resolved) {
    return new Response(JSON.stringify({ error: `Unknown auth path: ${path}` }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { method: apiMethod, params } = resolved;

  // Rate limit sensitive endpoints
  const SENSITIVE_PATHS = ["sign-in/email", "sign-up/email", "forget-password", "reset-password"];
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

  try {
    let body: Record<string, unknown> | undefined;
    if (request.method === "POST") {
      try {
        body = (await request.json()) as Record<string, unknown>;
      } catch {
        // no body
      }
    }

    const result = await apiMethod.call(auth.api, {
      body,
      headers: request.headers,
      request,
      ...(params ? { params } : {}),
      asResponse: true,
    });

    if (result instanceof Response) return result;

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    const stack = err instanceof Error ? err.stack : "";
    console.error(`[auth] ${path} error:`, message, stack);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

function dbUnavailable() {
  return new Response(JSON.stringify({ error: "Database not available" }), {
    status: 501,
    headers: { "Content-Type": "application/json" },
  });
}
