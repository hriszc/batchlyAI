import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";

import { jsonResponse, requireValidOrigin } from "@/lib/api-helpers";
import { createAuth } from "@/lib/auth/auth";
import { getD1Binding } from "@/lib/cloudflare/bindings";
import { getDb } from "@/lib/db";
import { user as userTable } from "@/lib/db/schema";
import { checkRateLimit } from "@/lib/rate-limit";
import { getStripe } from "@/lib/stripe";

export async function handlePortal(request: Request): Promise<Response> {
  const originError = requireValidOrigin(request);
  if (originError) return originError;

  const auth = createAuth();
  if (!auth) return jsonResponse({ error: "Auth unavailable" }, 501);

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return jsonResponse({ error: "Unauthorized" }, 401);

  const limit = checkRateLimit(`stripe:portal:${session.user.id}`, 5, 60);
  if (!limit.allowed) return jsonResponse({ error: "Too many requests. Please try again." }, 429);

  const userId = session.user.id;
  const binding = getD1Binding();
  if (!binding) return jsonResponse({ error: "DB unavailable" }, 501);

  const db = getDb(binding);
  const [row] = await db
    .select({ stripeCustomerId: userTable.stripeCustomerId })
    .from(userTable)
    .where(eq(userTable.id, userId));

  if (!row?.stripeCustomerId) {
    return jsonResponse({ error: "No Stripe customer found" }, 404);
  }

  try {
    const stripe = getStripe();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: row.stripeCustomerId,
      return_url: `${new URL(request.url).origin}/`,
    });

    return jsonResponse({ url: portalSession.url }, 200);
  } catch (err) {
    console.error("[stripe] portal error:", err);
    return jsonResponse({ error: "Billing service error" }, 500);
  }
}

export const Route = createFileRoute("/api/stripe/portal")({
  server: {
    handlers: {
      POST: async ({ request }) => handlePortal(request),
    },
  },
});
