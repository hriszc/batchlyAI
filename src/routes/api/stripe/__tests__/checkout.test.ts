import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { handleCheckout } from "@/routes/api/stripe/checkout";

const mockCheckoutCreate = vi.fn();
const mockGetSession = vi.fn();

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    checkout: { sessions: { create: mockCheckoutCreate } },
  }),
}));

vi.mock("@/lib/auth/auth", () => ({
  createAuth: () => ({
    api: { getSession: mockGetSession },
  }),
}));

vi.mock("@/env/server", () => ({
  env: {
    STRIPE_PRICE_ID_USD: "price_usd_test_001",
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: () => ({ allowed: true, remaining: 10, resetAt: Date.now() + 60000 }),
}));

function makeRequest(overrides?: { body?: Record<string, unknown>; url?: string }): Request {
  const body = overrides?.body;
  return {
    url: overrides?.url ?? "https://batchlyai.com/api/stripe/checkout",
    headers: new Headers(),
    json: () => {
      if (!body) throw new Error("no body");
      return Promise.resolve(body);
    },
  } as unknown as Request;
}

describe("handleCheckout", () => {
  beforeEach(() => {
    mockCheckoutCreate.mockClear();
    mockGetSession.mockClear();
    mockCheckoutCreate.mockResolvedValue({ url: "https://checkout.stripe.com/c/test" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const resp = await handleCheckout(makeRequest({ body: {} }));
    expect(resp.status).toBe(401);
    expect(((await resp.json()) as Record<string, unknown>).error).toBe("Unauthorized");
  });

  it("returns 200 with checkout URL for authenticated user", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1", email: "u@test.com" } });
    const resp = await handleCheckout(makeRequest({ body: {} }));
    expect(resp.status).toBe(200);
    const data = (await resp.json()) as { url: string };
    expect(data.url).toBe("https://checkout.stripe.com/c/test");
  });

  it("uses USD price with card + wechat_pay payment methods", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1", email: "u@test.com" } });
    await handleCheckout(makeRequest({ body: { quantity: 1 } }));
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: "price_usd_test_001", quantity: 1 }],
        payment_method_types: ["card", "wechat_pay"],
      }),
    );
  });

  it("passes quantity from request body", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1", email: "u@test.com" } });
    await handleCheckout(makeRequest({ body: { quantity: 5 } }));
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: "price_usd_test_001", quantity: 5 }],
      }),
    );
  });

  it("defaults to quantity 1 when no body is provided", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1", email: "u@test.com" } });
    const req = makeRequest() as unknown as Request & { json: () => never };
    Object.defineProperty(req, "json", {
      value: () => {
        throw new Error("no body");
      },
    });
    await handleCheckout(req);
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: "price_usd_test_001", quantity: 1 }],
      }),
    );
  });

  it("includes customer_email and metadata", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u2", email: "dev@batchlyai.com" } });
    await handleCheckout(makeRequest({ body: {} }));
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_email: "dev@batchlyai.com",
        metadata: { userId: "u2" },
      }),
    );
  });

  it("includes success_url and cancel_url", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1", email: "u@test.com" } });
    await handleCheckout(
      makeRequest({ url: "https://batchlyai.com/api/stripe/checkout", body: {} }),
    );
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: "https://batchlyai.com/?purchase=success",
        cancel_url: "https://batchlyai.com/?purchase=canceled",
      }),
    );
  });

  it("returns 500 when Stripe throws", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1", email: "u@test.com" } });
    mockCheckoutCreate.mockRejectedValue(new Error("Stripe failure"));
    const resp = await handleCheckout(makeRequest({ body: {} }));
    expect(resp.status).toBe(500);
    expect(((await resp.json()) as Record<string, unknown>).error).toBe("Payment processing error");
  });
});
