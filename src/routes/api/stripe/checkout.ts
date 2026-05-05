import { createFileRoute } from "@tanstack/react-router";

import { createAuth } from "@/lib/auth/auth";
import { env } from "@/env/server";
import { getStripe } from "@/lib/stripe";

export const Route = createFileRoute("/api/stripe/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
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

        try {
          const stripe = getStripe();
          const checkoutSession = await stripe.checkout.sessions.create({
            mode: "payment",
            line_items: [
              {
                price: env.STRIPE_PRICE_ID,
                quantity: 1,
              },
            ],
            customer_email: userEmail,
            metadata: { userId },
            success_url: `${origin}/?purchase=success`,
            cancel_url: `${origin}/?purchase=canceled`,
          });

          return new Response(
            JSON.stringify({ url: checkoutSession.url }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to create checkout";
          console.error("[stripe] checkout error:", message);
          return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
