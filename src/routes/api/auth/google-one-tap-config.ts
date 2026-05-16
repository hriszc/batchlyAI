import { createFileRoute } from "@tanstack/react-router";

import { env } from "@/env/server";
import { jsonResponse } from "@/lib/api-helpers";

function getRuntimeGoogleClientId(): string {
  const platformEnv = (globalThis as Record<string, unknown>).__env__ as
    | Record<string, unknown>
    | undefined;
  const platformClientId = platformEnv?.GOOGLE_CLIENT_ID;

  if (env.GOOGLE_CLIENT_ID) return env.GOOGLE_CLIENT_ID;
  return typeof platformClientId === "string" ? platformClientId : "";
}

export async function handleGoogleOneTapConfig(): Promise<Response> {
  return jsonResponse({ clientId: getRuntimeGoogleClientId() }, 200, {
    "Cache-Control": "no-store",
  });
}

export const Route = createFileRoute("/api/auth/google-one-tap-config")({
  server: {
    handlers: {
      GET: async () => handleGoogleOneTapConfig(),
    },
  },
});
