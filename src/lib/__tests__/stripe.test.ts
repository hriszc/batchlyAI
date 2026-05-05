import { describe, expect, it, vi, beforeEach } from "vitest";

const mockStripeCreate = vi.fn();

vi.mock("stripe", () => {
  const MockStripe = vi.fn(function Stripe(key: string, opts: Record<string, unknown>) {
    mockStripeCreate({ key, ...opts });
    return {} as unknown as import("stripe").default;
  });
  (MockStripe as unknown as Record<string, unknown>).createFetchHttpClient = vi.fn(
    () => "mock-fetch-client",
  );
  return { default: MockStripe };
});

vi.mock("@/env/server", () => ({
  env: {
    STRIPE_SECRET_KEY: "sk_test_mock_key_12345",
  },
}));

describe("getStripe", () => {
  beforeEach(() => {
    mockStripeCreate.mockClear();
    vi.resetModules();
  });

  it("returns the same instance on repeated calls (singleton)", async () => {
    const { getStripe } = await import("@/lib/stripe");
    const s1 = getStripe();
    const s2 = getStripe();
    expect(s1).toBe(s2);
  });

  it("passes the API key from env to Stripe constructor", async () => {
    const { getStripe } = await import("@/lib/stripe");
    getStripe();
    expect(mockStripeCreate).toHaveBeenCalledWith(
      expect.objectContaining({ key: "sk_test_mock_key_12345" }),
    );
  });

  it("uses the correct API version", async () => {
    const { getStripe } = await import("@/lib/stripe");
    getStripe();
    expect(mockStripeCreate).toHaveBeenCalledWith(
      expect.objectContaining({ apiVersion: "2026-04-22.dahlia" }),
    );
  });
});
