import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyMigrations, createTestDb, seedUser } from "#test/db-setup";
import { referral, referralCode } from "@/lib/db/schema";

const mocks = vi.hoisted(() => ({
  createAuth: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("@/lib/auth/auth", () => ({
  createAuth: mocks.createAuth,
}));

vi.mock("@/lib/db", () => ({
  getDb: (binding: unknown) => binding,
}));

vi.mock("@/lib/cloudflare/bindings", () => ({
  getD1Binding: () =>
    (globalThis as { __env__?: { batchlyai_db?: unknown } }).__env__?.batchlyai_db,
}));

import { handleGetReferralStats } from "@/routes/api/referral/stats";

function makeRequest() {
  return new Request("https://batchlyai.com/api/referral/stats", {
    headers: { Cookie: "sid=test" },
  });
}

describe("handleGetReferralStats", () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    db = createTestDb();
    applyMigrations(db);
    vi.clearAllMocks();
    mocks.createAuth.mockReturnValue({ api: { getSession: mocks.getSession } });
    mocks.getSession.mockResolvedValue({ user: { id: "referrer" } });
    (globalThis as { __env__?: { batchlyai_db: typeof db } }).__env__ = { batchlyai_db: db };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as { __env__?: unknown }).__env__;
  });

  it("returns 501 when auth is unavailable", async () => {
    mocks.createAuth.mockReturnValue(null);

    const response = await handleGetReferralStats(makeRequest());

    expect(response.status).toBe(501);
    await expect(response.json()).resolves.toEqual({ error: "Auth unavailable" });
  });

  it("returns 401 when the user is not authenticated", async () => {
    mocks.getSession.mockResolvedValue(null);

    const response = await handleGetReferralStats(makeRequest());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns 501 when the DB binding is unavailable", async () => {
    delete (globalThis as { __env__?: unknown }).__env__;

    const response = await handleGetReferralStats(makeRequest());

    expect(response.status).toBe(501);
    await expect(response.json()).resolves.toEqual({ error: "DB unavailable" });
  });

  it("aggregates credited referrals, commissions, and share URL", async () => {
    seedUser(db, { id: "referrer", email: "referrer@example.com" });
    seedUser(db, { id: "referee-1", email: "referee1@example.com" });
    seedUser(db, { id: "referee-2", email: "referee2@example.com" });
    seedUser(db, { id: "referee-3", email: "referee3@example.com" });

    db.insert(referralCode)
      .values({
        id: "code-1",
        userId: "referrer",
        code: "ABC123",
        createdAt: 1,
      })
      .run();

    db.insert(referral)
      .values([
        {
          id: "ref-1",
          referrerId: "referrer",
          refereeId: "referee-1",
          code: "ABC123",
          status: "credited",
          referrerCreditsAwarded: 50,
          refereeCreditsAwarded: 30,
          purchaseCommissionAwarded: 12,
          createdAt: 1,
        },
        {
          id: "ref-2",
          referrerId: "referrer",
          refereeId: "referee-2",
          code: "ABC123",
          status: "pending",
          referrerCreditsAwarded: 50,
          refereeCreditsAwarded: 30,
          purchaseCommissionAwarded: 8,
          createdAt: 2,
        },
        {
          id: "ref-3",
          referrerId: "referrer",
          refereeId: "referee-3",
          code: "ABC123",
          status: "credited",
          referrerCreditsAwarded: 20,
          refereeCreditsAwarded: 10,
          purchaseCommissionAwarded: 0,
          createdAt: 3,
        },
      ])
      .run();

    const response = await handleGetReferralStats(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      tier: "none",
      totalReferrals: 0,
      totalCreditsEarned: 70,
      commissionTotal: 20,
      referralCode: "ABC123",
      shareUrl: "https://batchlyai.com/r/ABC123",
    });
  });
});
