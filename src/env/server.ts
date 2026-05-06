import { createEnv } from "@t3-oss/env-core";
import * as z from "zod";

export const env = createEnv({
  server: {
    VITE_BASE_URL: z.string().url().default("http://localhost:3000"),
    BETTER_AUTH_SECRET: z
      .string()
      .min(32)
      .optional()
      .default("dev-secret-placeholder-batchlyai-2024"),

    // AI Gateway
    DEEPSEEK_API_KEY: z.string().optional(),
    GRSAI_API_KEY: z.string().min(1).optional().default("dev-key"),
    REPLICATE_API_KEY: z.string().optional(),
    GRS_WEBHOOK_SECRET: z.string().min(1).optional(),

    // OAuth2 providers, optional, update as needed
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    // Stripe
    STRIPE_SECRET_KEY: z.string().min(1).optional(),
    STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
    STRIPE_PRICE_ID_USD: z.string().min(1).optional().default("dev-stripe-price-usd"),
    STRIPE_PRICE_ID_CNY: z.string().min(1).optional().default("dev-stripe-price-cny"),
  },
  runtimeEnv: process.env,
});
