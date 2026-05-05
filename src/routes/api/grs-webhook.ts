import { createFileRoute } from "@tanstack/react-router";

import { env } from "@/env/server";
import { jsonResponse } from "@/lib/api-helpers";

function getKvBinding(): KVNamespace | undefined {
  const platformEnv = (globalThis as Record<string, unknown>).__env__ as
    | Record<string, unknown>
    | undefined;
  return platformEnv?.batchlyai_kv as KVNamespace | undefined;
}

interface GrsWebhookPayload {
  id?: string;
  status?: string;
  results?: { url: string }[];
  error?: string;
}

export const Route = createFileRoute("/api/grs-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (env.GRS_WEBHOOK_SECRET) {
          const url = new URL(request.url);
          const secret = url.searchParams.get("secret");
          if (secret !== env.GRS_WEBHOOK_SECRET) {
            return jsonResponse({ error: "Unauthorized" }, 401);
          }
        }

        try {
          const body = (await request.json()) as GrsWebhookPayload;
          const taskId = body.id;

          if (!taskId) {
            return jsonResponse({ error: "Missing task id" }, 400);
          }

          const kv = getKvBinding();
          if (!kv) {
            return jsonResponse({ error: "KV not available" }, 501);
          }

          const existing = await kv.get(`grs:${taskId}`);
          if (!existing) {
            return jsonResponse({ error: "Task not found" }, 404);
          }

          const taskData = JSON.parse(existing) as {
            userId: string;
            status: string;
            prompt?: string;
            aspectRatio?: string;
            createdAt: number;
          };

          if (body.status === "succeeded" && body.results?.length) {
            taskData.status = "succeeded";
            (taskData as Record<string, unknown>).urls = body.results.map((r) => r.url);
          } else if (body.status === "failed" || body.error) {
            taskData.status = "failed";
            (taskData as Record<string, unknown>).error = body.error || "Generation failed";
          } else {
            taskData.status = body.status || "processing";
          }

          await kv.put(`grs:${taskId}`, JSON.stringify(taskData), { expirationTtl: 3600 });

          return jsonResponse({ received: true }, 200);
        } catch {
          return jsonResponse({ error: "Webhook processing error" }, 500);
        }
      },
    },
  },
});
