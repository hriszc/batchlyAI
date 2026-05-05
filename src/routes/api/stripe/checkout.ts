import { createFileRoute } from "@tanstack/react-router";

import { env } from "@/env/server";
import { createAuth } from "@/lib/auth/auth";
import { getStripe } from "@/lib/stripe";

export async function handleCheckout(request: Request): Promise<Response> {
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
  const userEmail = session.user.email;
  const origin = new URL(request.url).origin;

  let currency = "usd";
  let quantity = 1;
  try {
    const body = await request.json();
    if (body.currency === "cny") currency = "cny";
    if (typeof body.quantity === "number" && body.quantity >= 1 && body.quantity <= 100) {
      quantity = Math.floor(body.quantity);
    }
  } catch {
    // no body or invalid JSON, default to usd + quantity 1
  }

  const priceId = currency === "cny" ? env.STRIPE_PRICE_ID_CNY : env.STRIPE_PRICE_ID_USD;

  try {
    const stripe = getStripe();
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: priceId,
          quantity,
        },
      ],
      customer_email: userEmail,
      metadata: { userId },
      success_url: `${origin}/?purchase=success`,
      cancel_url: `${origin}/?purchase=canceled`,
    });

    return new Response(JSON.stringify({ url: checkoutSession.url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create checkout";
    console.error("[stripe] checkout error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const Route = createFileRoute("/api/stripe/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => handleCheckout(request),
    },
  },
});
