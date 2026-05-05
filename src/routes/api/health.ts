import { createFileRoute } from "@tanstack/react-router";

import { jsonResponse } from "@/lib/api-helpers";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        return jsonResponse({ status: "ok", timestamp: Date.now() }, 200);
      },
    },
  },
});
