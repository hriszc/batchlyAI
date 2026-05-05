import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";

import { createAuth } from "@/lib/auth/auth";
import { getDb } from "@/lib/db";
import { user as userTable } from "@/lib/db/schema";
import { getStripe } from "@/lib/stripe";

function getD1Binding(): D1Database | undefined {
  const platformEnv = (globalThis as Record<string, unknown>).__env__ as
    | Record<string, unknown>
    | undefined;
  return platformEnv?.batchlyai_db as D1Database | undefined;
}

export async function handlePortal(request: Request): Promise<Response> {
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

  const userId = session.user.id;
  const binding = getD1Binding();
  if (!binding) {
    return new Response(JSON.stringify({ error: "DB unavailable" }), {
      status: 501,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = getDb(binding);
  const [row] = await db
    .select({ stripeCustomerId: userTable.stripeCustomerId })
    .from(userTable)
    .where(eq(userTable.id, userId));

  if (!row?.stripeCustomerId) {
    return new Response(JSON.stringify({ error: "No Stripe customer found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const stripe = getStripe();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: row.stripeCustomerId,
      return_url: `${new URL(request.url).origin}/`,
    });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create portal session";
    console.error("[stripe] portal error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const Route = createFileRoute("/api/stripe/portal")({
  server: {
    handlers: {
      POST: async ({ request }) => handlePortal(request),
    },
  },
});
