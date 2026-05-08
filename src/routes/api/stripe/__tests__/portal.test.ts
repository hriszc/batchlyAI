import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { createTestDb, applyMigrations, seedUser } from "#test/db-setup";

const mockPortalCreate = vi.fn();
const mockGetSession = vi.fn();
let testDb: ReturnType<typeof createTestDb>;

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    billingPortal: { sessions: { create: mockPortalCreate } },
  }),
}));

vi.mock("@/lib/auth/auth", () => ({
  createAuth: () => ({
    api: { getSession: mockGetSession },
  }),
}));

vi.mock("@/lib/db", () => ({
  getDb: () => testDb,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: () => ({ allowed: true, remaining: 10, resetAt: Date.now() + 60000 }),
}));

import { handlePortal } from "@/routes/api/stripe/portal";

function makeRequest(url?: string): Request {
  return {
    url: url ?? "https://batchlyai.com/api/stripe/portal",
    headers: new Headers(),
  } as unknown as Request;
}

describe("handlePortal", () => {
  beforeEach(() => {
    testDb = createTestDb();
    applyMigrations(testDb);
    mockPortalCreate.mockClear();
    mockGetSession.mockClear();
    mockPortalCreate.mockResolvedValue({ url: "https://billing.stripe.com/p/test" });
    // Mock the D1 binding
    (globalThis as Record<string, unknown>).__env__ = {
      batchlyai_db: {} as D1Database,
    };
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).__env__;
    vi.restoreAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    const resp = await handlePortal(makeRequest());
    expect(resp.status).toBe(401);
  });

  it("returns 404 when user has no stripeCustomerId", async () => {
    seedUser(testDb, { id: "u1" });
    mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    const resp = await handlePortal(makeRequest());
    expect(resp.status).toBe(404);
    expect(((await resp.json()) as Record<string, unknown>).error).toBe("No Stripe customer found");
  });

  it("returns 200 with portal URL when user has stripeCustomerId", async () => {
    seedUser(testDb, { id: "u1", stripeCustomerId: "cus_001" });
    mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    const resp = await handlePortal(makeRequest());
    expect(resp.status).toBe(200);
    const data = (await resp.json()) as { url: string };
    expect(data.url).toBe("https://billing.stripe.com/p/test");
  });

  it("creates portal session with correct customer and return_url", async () => {
    seedUser(testDb, { id: "u1", stripeCustomerId: "cus_002" });
    mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    await handlePortal(makeRequest("https://batchlyai.com/api/stripe/portal"));
    expect(mockPortalCreate).toHaveBeenCalledWith({
      customer: "cus_002",
      return_url: "https://batchlyai.com/",
    });
  });

  it("returns 501 when DB binding is unavailable", async () => {
    delete (globalThis as Record<string, unknown>).__env__;
    mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    const resp = await handlePortal(makeRequest());
    expect(resp.status).toBe(501);
  });

  it("returns 500 when Stripe throws", async () => {
    seedUser(testDb, { id: "u1", stripeCustomerId: "cus_003" });
    mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    mockPortalCreate.mockRejectedValue(new Error("Stripe failure"));
    const resp = await handlePortal(makeRequest());
    expect(resp.status).toBe(500);
    expect(((await resp.json()) as Record<string, unknown>).error).toBe("Billing service error");
  });
});
