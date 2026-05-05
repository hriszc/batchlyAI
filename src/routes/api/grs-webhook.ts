import { createFileRoute } from "@tanstack/react-router";

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
        try {
          const body = (await request.json()) as GrsWebhookPayload;
          const taskId = body.id;

          if (!taskId) {
            return new Response(JSON.stringify({ error: "Missing task id" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const kv = getKvBinding();
          if (!kv) {
            return new Response(JSON.stringify({ error: "KV not available" }), {
              status: 501,
              headers: { "Content-Type": "application/json" },
            });
          }

          // Read existing task data
          const existing = await kv.get(`grs:${taskId}`);
          if (!existing) {
            return new Response(JSON.stringify({ error: "Task not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            });
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
            // Still processing — update with whatever we got
            taskData.status = body.status || "processing";
          }

          await kv.put(`grs:${taskId}`, JSON.stringify(taskData), { expirationTtl: 3600 });

          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Webhook error";
          return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
