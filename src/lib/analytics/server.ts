/**
 * Server-side GA4 tracking via Measurement Protocol.
 * Sends key business events directly from the Worker, immune to adblock.
 */

function getGa4Config(): { id?: string; secret?: string } {
  const platformEnv = (globalThis as Record<string, unknown>).__env__ as
    | Record<string, unknown>
    | undefined;
  return {
    id: platformEnv?.GA4_MEASUREMENT_ID as string | undefined,
    secret: platformEnv?.GA4_API_SECRET as string | undefined,
  };
}

export async function trackServer(
  event: string,
  clientId: string,
  props?: Record<string, unknown>,
) {
  const { id, secret } = getGa4Config();
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
