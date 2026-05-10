import { eq } from "drizzle-orm";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { createTestDb, applyMigrations, seedUser } from "#test/db-setup";
import { user as userTable } from "@/lib/db/schema";

const mockConstructEventAsync = vi.fn();
const mockListLineItems = vi.fn();
let testDb: ReturnType<typeof createTestDb>;

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    webhooks: { constructEventAsync: mockConstructEventAsync },
    checkout: { sessions: { listLineItems: mockListLineItems } },
  }),
}));

vi.mock("@/env/server", () => ({
  env: {
    STRIPE_WEBHOOK_SECRET: "whsec_test_123",
    STRIPE_PRICE_ID_USD: "price_usd_test_001",
  },
}));

vi.mock("@/lib/db", () => ({
  getDb: () => testDb,
}));

import { handleWebhook } from "@/routes/api/stripe/webhook";

function makeRequest(
  overrides: {
    body?: string;
    signature?: string;
  } = {},
): Request {
  return {
    text: () => Promise.resolve(overrides.body ?? "{}"),
    headers: new Headers(overrides.signature ? { "stripe-signature": overrides.signature } : {}),
  } as unknown as Request;
}

function makeSessionEvent(overrides?: {
  id?: string;
  userId?: string;
  amountTotal?: number;
  customerId?: string | null;
  status?: string;
  paymentStatus?: string;
}): Record<string, unknown> {
  return {
    type: "checkout.session.completed",
    data: {
      object: {
        id: overrides?.id ?? "cs_test_001",
        amount_total: overrides?.amountTotal ?? 1000,
        status: overrides?.status ?? "complete",
        payment_status: overrides?.paymentStatus ?? "paid",
        metadata: { userId: overrides?.userId ?? "test-user-001" },
        customer: overrides?.customerId === null ? null : (overrides?.customerId ?? "cus_001"),
      },
    },
  };
}

describe("handleWebhook", () => {
  beforeEach(() => {
    testDb = createTestDb();
    applyMigrations(testDb);
    mockConstructEventAsync.mockClear();
    mockListLineItems.mockClear();
    // Mock the D1 binding via globalThis.__env__ so getD1Binding() finds it
    (globalThis as Record<string, unknown>).__env__ = {
      batchlyai_db: {} as D1Database,
    };
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).__env__;
    vi.restoreAllMocks();
  });

  it("returns 501 when DB binding is unavailable", async () => {
    delete (globalThis as Record<string, unknown>).__env__;
    const resp = await handleWebhook(makeRequest());
    expect(resp.status).toBe(501);
    expect(((await resp.json()) as Record<string, unknown>).error).toBe("DB unavailable");
  });

  it("returns 400 when signature verification fails", async () => {
    mockConstructEventAsync.mockRejectedValue(new Error("Invalid signature"));
    const resp = await handleWebhook(makeRequest({ signature: "bad_sig" }));
    expect(resp.status).toBe(400);
    expect(((await resp.json()) as Record<string, unknown>).error).toBe(
      "Webhook verification failed",
    );
  });

  it("returns 400 when checkout session has no userId in metadata", async () => {
    mockConstructEventAsync.mockResolvedValue({
      type: "checkout.session.completed",
      data: { object: { id: "cs_001", amount_total: 1000, metadata: {}, customer: null } },
    });
    const resp = await handleWebhook(makeRequest({ signature: "sig" }));
    expect(resp.status).toBe(400);
  });

  it("credits user and inserts purchase record on valid checkout.session.completed", async () => {
    seedUser(testDb, { id: "test-user-001", credits: 100 });
    mockConstructEventAsync.mockResolvedValue(
      makeSessionEvent({ amountTotal: 1000, customerId: null }),
    );
    mockListLineItems.mockResolvedValue({
      data: [{ price: { id: "price_usd_test_001" }, quantity: 1 }],
    });

    const resp = await handleWebhook(makeRequest({ signature: "sig" }));
    expect(resp.status).toBe(200);

    const row = testDb
      .select({ credits: userTable.credits })
      .from(userTable)
      .where(eq(userTable.id, "test-user-001"))
      .get();
    expect(row?.credits).toBe(1100);
  });

  it("ignores unsupported line items", async () => {
    seedUser(testDb, { id: "test-user-001", credits: 0 });
    mockConstructEventAsync.mockResolvedValue(
      makeSessionEvent({ amountTotal: 500, customerId: null }),
    );
    mockListLineItems.mockResolvedValue({
      data: [{ price: { id: "price_unknown" }, quantity: 1 }],
    });

    const resp = await handleWebhook(makeRequest({ signature: "sig" }));
    expect(resp.status).toBe(400);
  });

  it("rejects incomplete sessions", async () => {
    seedUser(testDb, { id: "test-user-001", credits: 0 });
    mockConstructEventAsync.mockResolvedValue(
      makeSessionEvent({ status: "open", paymentStatus: "unpaid", customerId: null }),
    );
    mockListLineItems.mockResolvedValue({
      data: [{ price: { id: "price_usd_test_001" }, quantity: 1 }],
    });

    const resp = await handleWebhook(makeRequest({ signature: "sig" }));
    expect(resp.status).toBe(200);
    const row = testDb
      .select({ credits: userTable.credits })
      .from(userTable)
      .where(eq(userTable.id, "test-user-001"))
      .get();
    expect(row?.credits).toBe(0);
  });

  it("sets stripeCustomerId on first purchase", async () => {
    seedUser(testDb, { id: "test-user-001", stripeCustomerId: null });
    mockConstructEventAsync.mockResolvedValue(makeSessionEvent({ customerId: "cus_live_123" }));
    mockListLineItems.mockResolvedValue({
      data: [{ price: { id: "price_usd_test_001" }, quantity: 1 }],
    });

    await handleWebhook(makeRequest({ signature: "sig" }));
    const row = testDb
      .select({ stripeCustomerId: userTable.stripeCustomerId })
      .from(userTable)
      .where(eq(userTable.id, "test-user-001"))
      .get();
    expect(row?.stripeCustomerId).toBe("cus_live_123");
  });

  it("is idempotent — duplicate event returns 200", async () => {
    seedUser(testDb, { id: "test-user-001", credits: 50 });
    mockConstructEventAsync.mockResolvedValue(
      makeSessionEvent({ id: "cs_dup_001", amountTotal: 1000, customerId: null }),
    );
    mockListLineItems.mockResolvedValue({
      data: [{ price: { id: "price_usd_test_001" }, quantity: 1 }],
    });

    await handleWebhook(makeRequest({ signature: "sig" }));
    const credits1 = testDb
      .select({ credits: userTable.credits })
      .from(userTable)
      .where(eq(userTable.id, "test-user-001"))
      .get();

    const resp = await handleWebhook(makeRequest({ signature: "sig" }));
    expect(resp.status).toBe(200);

    const credits2 = testDb
      .select({ credits: userTable.credits })
      .from(userTable)
      .where(eq(userTable.id, "test-user-001"))
      .get();
    expect(credits2?.credits).toBe(credits1?.credits);
  });

  it("returns 200 for non-checkout events without side effects", async () => {
    seedUser(testDb, { id: "test-user-001", credits: 10 });
    mockConstructEventAsync.mockResolvedValue({ type: "charge.succeeded", data: { object: {} } });

    const resp = await handleWebhook(makeRequest({ signature: "sig" }));
    expect(resp.status).toBe(200);
    expect(((await resp.json()) as Record<string, unknown>).received).toBe(true);

    const row = testDb
      .select({ credits: userTable.credits })
      .from(userTable)
      .where(eq(userTable.id, "test-user-001"))
      .get();
    expect(row?.credits).toBe(10);
  });

  it("handles null amount_total with default 1000 credits", async () => {
    seedUser(testDb, { id: "test-user-001", credits: 0 });
    mockConstructEventAsync.mockResolvedValue({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_null_amt",
          status: "complete",
          payment_status: "paid",
          metadata: { userId: "test-user-001" },
          customer: null,
        },
      },
    });
    mockListLineItems.mockResolvedValue({
      data: [{ price: { id: "price_usd_test_001" }, quantity: 1 }],
    });
    const resp = await handleWebhook(makeRequest({ signature: "sig" }));
    expect(resp.status).toBe(200);
    const row = testDb
      .select({ credits: userTable.credits })
      .from(userTable)
      .where(eq(userTable.id, "test-user-001"))
      .get();
    expect(row?.credits).toBe(1000);
  });

  it("ignores non-checkout event types", async () => {
    mockConstructEventAsync.mockResolvedValue({
      type: "payment_intent.created",
      data: { object: {} },
    });
    const resp = await handleWebhook(makeRequest({ signature: "sig" }));
    expect(resp.status).toBe(200);
  });
});
