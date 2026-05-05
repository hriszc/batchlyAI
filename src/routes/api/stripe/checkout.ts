import { createFileRoute } from "@tanstack/react-router";

import { env } from "@/env/server";
import { jsonResponse } from "@/lib/api-helpers";
import { createAuth } from "@/lib/auth/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { getStripe } from "@/lib/stripe";

export const Route = createFileRoute("/api/stripe/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = createAuth();
        if (!auth) {
          return jsonResponse({ error: "Auth unavailable" }, 501);
        }

        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user?.id) {
          return jsonResponse({ error: "Unauthorized" }, 401);
        }

        const limit = checkRateLimit(`stripe:checkout:user:${session.user.id}`, 5, 60);
        if (!limit.allowed) {
          return jsonResponse({ error: "Too many requests. Please try again later." }, 429);
        }

        const userId = session.user.id;
        const userEmail = session.user.email;
        const origin = new URL(request.url).origin;

        let currency = "usd";
        try {
          const body = await request.json();
          if (body.currency === "cny") currency = "cny";
        } catch {
          // no body or invalid JSON, default to usd
        }

        const priceId = currency === "cny" ? env.STRIPE_PRICE_ID_CNY : env.STRIPE_PRICE_ID_USD;

        try {
          const stripe = getStripe();
          const checkoutSession = await stripe.checkout.sessions.create({
            mode: "payment",
            line_items: [
              {
                price: priceId,
                quantity: 1,
              },
            ],
            customer_email: userEmail,
            metadata: { userId },
            success_url: `${origin}/?purchase=success`,
            cancel_url: `${origin}/?purchase=canceled`,
          });

          return jsonResponse({ url: checkoutSession.url }, 200);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to create checkout";
          console.error("[stripe] checkout error:", message);
          return jsonResponse({ error: "Payment service error" }, 500);
        }
      },
    },
  },
});
