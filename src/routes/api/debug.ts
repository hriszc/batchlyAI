import { createFileRoute } from "@tanstack/react-router";

import { createAuth } from "@/lib/auth/auth";
import { env } from "@/env/server";

export const Route = createFileRoute("/api/debug")({
  server: {
    handlers: {
      GET: async () => {
        const results: Record<string, unknown> = {};

        results.platformEnvExists = typeof (globalThis as Record<string, unknown>).__env__ !== "undefined";

        try {
          results.env_BASE_URL = env.VITE_BASE_URL;
          results.env_GRSAI_KEY = env.GRSAI_API_KEY ? "set" : "missing";
          results.env_REPLICATE_KEY = env.REPLICATE_API_KEY ? "set" : "missing";
          results.env_GITHUB_ID = env.GITHUB_CLIENT_ID || "not set";
          results.env_GOOGLE_ID = env.GOOGLE_CLIENT_ID || "not set";
        } catch (e) {
          results.envError = String(e);
        }

        try {
          const auth = createAuth();
          results.authCreated = !!auth;
          if (auth) {
            results.authOptions = "handler exists";
          } else {
            results.authFailReason = "createAuth returned null";
          }
        } catch (e) {
          results.authError = String(e);
        }

        return new Response(JSON.stringify(results, null, 2), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
