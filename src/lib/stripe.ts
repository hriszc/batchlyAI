import Stripe from "stripe";

import { env } from "@/env/server";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-04-22.dahlia",
      httpClient: Stripe.createFetchHttpClient(),
    });
  }
  return _stripe;
}
