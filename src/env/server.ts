import { createEnv } from "@t3-oss/env-core";
import * as z from "zod";

export const env = createEnv({
  server: {
    VITE_BASE_URL: z.url().default("http://localhost:3000"),
    BETTER_AUTH_SECRET: z
      .string()
      .min(32)
      .optional()
      .default("dev-secret-do-not-use-in-production-42-characters-minimum"),

    // AI Gateway
    DEEPSEEK_API_KEY: z.string().optional(),
    GRSAI_API_KEY: z.string().min(1).optional(),
    REPLICATE_API_KEY: z.string().optional(),
    GRS_WEBHOOK_SECRET: z.string().min(1).optional(),
    FILE_URL_SIGNING_SECRET: z.string().min(32).optional(),

    // OAuth2 providers, optional, update as needed
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    // Cloudflare Turnstile
    TURNSTILE_SECRET_KEY: z.string().min(1).optional(),

    // GA4
    GA4_MEASUREMENT_ID: z.string().optional(),
    GA4_API_SECRET: z.string().optional(),

    // Stripe
    STRIPE_SECRET_KEY: z.string().min(1).optional(),
    STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
    STRIPE_PRICE_ID_USD: z.string().min(1).optional(),
    STRIPE_PRICE_ID_CNY: z.string().min(1).optional(),
  },
  runtimeEnv: process.env,
});
