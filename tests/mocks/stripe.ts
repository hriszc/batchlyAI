import { vi } from "vitest";

export interface StripeMockOverrides {
  checkoutUrl?: string | null;
  portalUrl?: string | null;
  webhookEvent?: Record<string, unknown> | Error;
}

export function createMockStripe(overrides?: StripeMockOverrides) {
  const checkoutUrl = overrides?.checkoutUrl ?? "https://checkout.stripe.com/c/test";
  const portalUrl = overrides?.portalUrl ?? "https://billing.stripe.com/s/test";

  return {
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: checkoutUrl }),
      },
    },
    billingPortal: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: portalUrl }),
      },
    },
    webhooks: {
      constructEventAsync:
        overrides?.webhookEvent instanceof Error
          ? vi.fn().mockRejectedValue(overrides.webhookEvent)
          : vi.fn().mockResolvedValue(
              overrides?.webhookEvent ?? {
                type: "checkout.session.completed",
                data: {
                  object: {
                    id: "cs_test_001",
                    amount_total: 1000,
                    metadata: { userId: "test-user-001" },
                    customer: null,
                  },
                },
              },
            ),
    },
  } as unknown as import("stripe").default;
}
