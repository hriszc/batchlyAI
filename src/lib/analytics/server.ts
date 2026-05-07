/**
 * Server-side GA4 tracking via Measurement Protocol.
 * Sends key business events directly from the Worker, immune to adblock.
 */

import { env } from "@/env/server";

export async function trackServer(
  event: string,
  clientId: string,
  props?: Record<string, unknown>,
) {
  const id = env.GA4_MEASUREMENT_ID;
  const secret = env.GA4_API_SECRET;
  if (!id || !secret) return;

  const ctx = new ExecutionContext();
  ctx.waitUntil(
    fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${id}&api_secret=${secret}`,
      {
        method: "POST",
        body: JSON.stringify({
          client_id: clientId,
          events: [{ name: event, params: props }],
        }),
      },
    ).catch(() => {}),
  );
}
