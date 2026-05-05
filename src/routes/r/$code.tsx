import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { referralCode } from "@/lib/db/schema";

function getD1Binding(): D1Database | undefined {
  const platformEnv = (globalThis as Record<string, unknown>).__env__ as
    | Record<string, unknown>
    | undefined;
  return platformEnv?.batchlyai_db as D1Database | undefined;
}

function redirectToSignup(origin: string, refCode?: string) {
  const headers = new Headers();
  const targetUrl = refCode ? `${origin}/signup?ref=${refCode}` : `${origin}/signup`;

  if (refCode) {
    headers.set(
      "Set-Cookie",
      `ref=${refCode}; Path=/; Max-Age=${30 * 24 * 60 * 60}; SameSite=Lax; HttpOnly`,
    );
  }
  headers.set("Location", targetUrl);
  return new Response(null, { status: 302, headers });
}

export const Route = createFileRoute("/r/$code")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const code = (params as { code: string }).code;
        if (!code) {
          return redirectToSignup(new URL(request.url).origin);
        }

        const binding = getD1Binding();
        if (!binding) {
          return redirectToSignup(new URL(request.url).origin, code);
        }

        const db = getDb(binding);
        const [record] = await db.select().from(referralCode).where(eq(referralCode.code, code));

        if (!record) {
          return redirectToSignup(new URL(request.url).origin);
        }

        return redirectToSignup(new URL(request.url).origin, code);
      },
    },
  },
});
