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
    STRIPE_PRICE_ID_CNY: "price_cny_test_001",
  },
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

  it("returns 200 with checkout URL for authenticated user (default USD)", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1", email: "u@test.com" } });
    const resp = await handleCheckout(makeRequest({ body: { currency: "usd" } }));
    expect(resp.status).toBe(200);
    const data = (await resp.json()) as { url: string };
    expect(data.url).toBe("https://checkout.stripe.com/c/test");
  });

  it("uses CNY price when currency=cny is passed", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1", email: "u@test.com" } });
    await handleCheckout(makeRequest({ body: { currency: "cny" } }));
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: "price_cny_test_001", quantity: 1 }],
      }),
    );
  });

  it("uses USD price when currency=usd is passed", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1", email: "u@test.com" } });
    await handleCheckout(makeRequest({ body: { currency: "usd" } }));
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: "price_usd_test_001", quantity: 1 }],
      }),
    );
  });

  it("defaults to USD when no body is provided", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1", email: "u@test.com" } });
    const req = makeRequest() as unknown as Request & { json: () => never };
    // Override json to throw
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

  it("defaults to USD when body has no currency field", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1", email: "u@test.com" } });
    await handleCheckout(makeRequest({ body: { other: true } }));
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: "price_usd_test_001", quantity: 1 }],
      }),
    );
  });

  it("includes customer_email and metadata in the session", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u2", email: "dev@batchlyai.com" } });
    await handleCheckout(makeRequest({ body: {} }));
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_email: "dev@batchlyai.com",
        metadata: { userId: "u2" },
      }),
    );
  });

  it("includes success_url and cancel_url with origin", async () => {
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

  it("includes wechat_pay payment method for CNY currency", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1", email: "u@test.com" } });
    await handleCheckout(makeRequest({ body: { currency: "cny" } }));
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_method_types: ["card", "wechat_pay"],
      }),
    );
  });

  it("only includes card payment method for USD currency", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1", email: "u@test.com" } });
    await handleCheckout(makeRequest({ body: { currency: "usd" } }));
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_method_types: ["card"],
      }),
    );
  });

  it("returns 500 when Stripe throws", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "u1", email: "u@test.com" } });
    mockCheckoutCreate.mockRejectedValue(new Error("Stripe failure"));
    const resp = await handleCheckout(makeRequest({ body: {} }));
    expect(resp.status).toBe(500);
    expect(((await resp.json()) as Record<string, unknown>).error).toBe("Stripe failure");
  });
});
