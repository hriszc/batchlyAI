/**
 * Server-side GA4 tracking via Measurement Protocol.
 * Sends key business events directly from the Worker, immune to adblock.
 */

export async function trackServer(
  event: string,
  clientId: string,
  props?: Record<string, unknown>,
) {
  // Server-only env; skip in test/client environments
  if (typeof process === "undefined" || !process.env?.GA4_MEASUREMENT_ID) return;
  const id = process.env.GA4_MEASUREMENT_ID;
  const secret = process.env.GA4_API_SECRET;
  if (!id || !secret) return;

  void fetch(
    `https://www.google-analytics.com/mp/collect?measurement_id=${id}&api_secret=${secret}`,
    {
      method: "POST",
      body: JSON.stringify({
        client_id: clientId,
        events: [{ name: event, params: props }],
      }),
    },
  ).catch(() => {});
}
