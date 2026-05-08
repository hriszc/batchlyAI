import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";

import { env } from "@/env/server";
import { jsonResponse } from "@/lib/api-helpers";
import { getD1Binding, getKvBinding } from "@/lib/cloudflare/bindings";
import { mirrorImageToR2 } from "@/lib/cloudflare/r2";
import { getDb } from "@/lib/db";
import { generation } from "@/lib/db/schema/data-flywheel.schema";

function hexToBuf(hex: string): Uint8Array {
  const bytes = new Uint8Array(Math.ceil(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

interface GrsWebhookPayload {
  id?: string;
  status?: string;
  results?: { url: string }[];
  error?: string;
}

export async function handleGrsWebhook(request: Request): Promise<Response> {
  const webhookSecret = env.GRS_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return jsonResponse({ error: "Webhook not configured" }, 501);
  }

  const rawBody = await request.text();
  const sig = request.headers.get("x-grs-signature") || "";

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(webhookSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    hexToBuf(sig).buffer as ArrayBuffer,
    encoder.encode(rawBody),
  );
  if (!valid) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  try {
    const body = JSON.parse(rawBody) as GrsWebhookPayload;
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
      const urls = body.results.map((r) => r.url);
      (taskData as Record<string, unknown>).urls = urls;

      // Mirror images to R2 and update generation record
      try {
        const genRaw = await kv.get(`gen:${taskId}`);
        if (!genRaw) {
          console.warn(`[grs-webhook] No KV entry for task ${taskId}, cannot update generation`);
        } else {
          const genData = JSON.parse(genRaw) as { generationId: string; userId: string };
          const binding = getD1Binding();
          if (!binding) {
            console.warn("[grs-webhook] D1 binding not available");
          } else {
            const r2Urls = await Promise.all(
              urls.map((url, i) =>
                mirrorImageToR2(
                  url,
                  `generations/${genData.userId}/${genData.generationId}/${i}.png`,
                ),
              ),
            );
            const db = getDb(binding);
            await db
              .update(generation)
              .set({ resultUrls: JSON.stringify(r2Urls) })
              .where(eq(generation.id, genData.generationId));
            console.log(
              `[grs-webhook] Updated generation ${genData.generationId} with ${r2Urls.length} URLs (R2 mirrored)`,
            );
          }
        }
      } catch (err) {
        console.error("[grs-webhook] Failed to update generation record:", err);
      }
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
}

export const Route = createFileRoute("/api/grs-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => handleGrsWebhook(request),
    },
  },
});
