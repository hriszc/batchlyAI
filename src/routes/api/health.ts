import { createFileRoute } from "@tanstack/react-router";

import { jsonResponse } from "@/lib/api-helpers";

export async function handleHealth(): Promise<Response> {
  return jsonResponse({ status: "ok", timestamp: Date.now() }, 200);
}

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => handleHealth(),
    },
  },
});
