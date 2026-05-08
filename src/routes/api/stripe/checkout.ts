import { createFileRoute } from "@tanstack/react-router";

import { env } from "@/env/server";
import { jsonResponse } from "@/lib/api-helpers";
import { createAuth } from "@/lib/auth/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { getStripe } from "@/lib/stripe";

export async function handleCheckout(request: Request): Promise<Response> {
  const auth = createAuth();
  if (!auth) return jsonResponse({ error: "Auth unavailable" }, 501);

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return jsonResponse({ error: "Unauthorized" }, 401);

  const limit = checkRateLimit(`stripe:checkout:${session.user.id}`, 5, 60);
  if (!limit.allowed) return jsonResponse({ error: "Too many requests. Please try again." }, 429);

  const userId = session.user.id;
  const userEmail = session.user.email;
  const origin = new URL(request.url).origin;

  let quantity = 1;
  try {
    const body = await request.json();
    if (typeof body.quantity === "number" && body.quantity >= 1 && body.quantity <= 100) {
      quantity = Math.floor(body.quantity);
    }
  } catch {
    // no body or invalid JSON, default to quantity 1
  }

  const priceId = env.STRIPE_PRICE_ID_USD;
  if (!priceId) {
    console.error("[stripe] STRIPE_PRICE_ID_USD is not configured");
    return jsonResponse({ error: "Payment service not configured" }, 500);
  }

  try {
    const stripe = getStripe();
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card", "alipay", "wechat_pay"],
      line_items: [{ price: priceId, quantity }],
      customer_email: userEmail,
      metadata: { userId },
      success_url: `${origin}/?purchase=success`,
      cancel_url: `${origin}/?purchase=canceled`,
    });

    return jsonResponse({ url: checkoutSession.url }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe] checkout error:", message);
    return jsonResponse({ error: message }, 500);
  }
}

export const Route = createFileRoute("/api/stripe/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => handleCheckout(request),
    },
  },
});
