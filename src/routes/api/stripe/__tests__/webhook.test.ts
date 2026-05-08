import { eq } from "drizzle-orm";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { createTestDb, applyMigrations, seedUser } from "#test/db-setup";
import { user as userTable } from "@/lib/db/schema";

const mockConstructEventAsync = vi.fn();
let testDb: ReturnType<typeof createTestDb>;

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    webhooks: { constructEventAsync: mockConstructEventAsync },
  }),
}));

vi.mock("@/env/server", () => ({
  env: {
    STRIPE_WEBHOOK_SECRET: "whsec_test_123",
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
}): Record<string, unknown> {
  return {
    type: "checkout.session.completed",
    data: {
      object: {
        id: overrides?.id ?? "cs_test_001",
        amount_total: overrides?.amountTotal ?? 1000,
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

    const resp = await handleWebhook(makeRequest({ signature: "sig" }));
    expect(resp.status).toBe(200);

    const row = testDb
      .select({ credits: userTable.credits })
      .from(userTable)
      .where(eq(userTable.id, "test-user-001"))
      .get();
    // $10 = 1000 amount_total; 1000/100 * 100 = 1000 credits
    expect(row?.credits).toBe(1100);
  });

  it("handles different amount_total correctly", async () => {
    seedUser(testDb, { id: "test-user-001", credits: 0 });
    mockConstructEventAsync.mockResolvedValue(
      makeSessionEvent({ amountTotal: 500, customerId: null }),
    );

    await handleWebhook(makeRequest({ signature: "sig" }));
    const row = testDb
      .select({ credits: userTable.credits })
      .from(userTable)
      .where(eq(userTable.id, "test-user-001"))
      .get();
    expect(row?.credits).toBe(500);
  });

  it("defaults amount_total to 1000 when missing", async () => {
    seedUser(testDb, { id: "test-user-001", credits: 0 });
    const event = {
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_002",
          metadata: { userId: "test-user-001" },
          customer: null,
        },
      },
    };
    mockConstructEventAsync.mockResolvedValue(event);
    await handleWebhook(makeRequest({ signature: "sig" }));
    const row = testDb
      .select({ credits: userTable.credits })
      .from(userTable)
      .where(eq(userTable.id, "test-user-001"))
      .get();
    expect(row?.credits).toBe(1000);
  });

  it("sets stripeCustomerId on first purchase", async () => {
    seedUser(testDb, { id: "test-user-001", stripeCustomerId: null });
    mockConstructEventAsync.mockResolvedValue(makeSessionEvent({ customerId: "cus_live_123" }));

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
        object: { id: "cs_null_amt", metadata: { userId: "test-user-001" }, customer: null },
      },
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
