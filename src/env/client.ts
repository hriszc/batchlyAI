import { createEnv } from "@t3-oss/env-core";
import * as z from "zod";

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_BASE_URL: z.url().default("http://localhost:3000"),
    VITE_GOOGLE_CLIENT_ID: z.string().optional(),
    VITE_GA4_MEASUREMENT_ID: z.string().optional(),
    VITE_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  },
  runtimeEnv: import.meta.env,
});
