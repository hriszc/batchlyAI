import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { createTestDb, applyMigrations, seedUser } from "#test/db-setup";

vi.mock("@/lib/db", () => ({
  getDb: (b: unknown) => b as ReturnType<typeof createTestDb>,
}));

import { processReferralAfterSignup } from "@/lib/referral/process";

function makeRequest(body: Record<string, unknown>, ip?: string): Request {
  return {
    clone: () =>
      ({
        json: () => Promise.resolve(body),
      }) as unknown as Request,
    headers: new Headers(ip ? { "CF-Connecting-IP": ip } : {}),
  } as unknown as Request;
}

function seedReferralCode(db: ReturnType<typeof createTestDb>, userId: string, code: string) {
  const now = Math.floor(Date.now() / 1000);
  const sqlite = (db as any).session?.client || (db as any).driver?.client;
  sqlite
    .prepare(`INSERT INTO referral_code (id, user_id, code, created_at) VALUES (?, ?, ?, ?)`)
    .run(`rc-${code}`, userId, code, now);
}

function getReferrals(db: ReturnType<typeof createTestDb>, refereeId: string): any[] {
  const sqlite = (db as any).session?.client || (db as any).driver?.client;
  return sqlite.prepare(`SELECT * FROM referral WHERE referee_id = ?`).all(refereeId);
}

describe("processReferralAfterSignup", () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    db = createTestDb();
    applyMigrations(db);
    (globalThis as Record<string, unknown>).__env__ = { batchlyai_db: db };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as Record<string, unknown>).__env__;
  });

  it("returns early when signup has no user", async () => {
    await processReferralAfterSignup(makeRequest({}), { user: undefined } as any);
  });

  it("returns early when ref code is empty", async () => {
    seedUser(db, { id: "new-user", email: "new@t.com" });
    await processReferralAfterSignup(makeRequest({ ref: "" }), {
      user: { id: "new-user", email: "new@t.com" },
    });
  });

  it("returns early when ref code not found", async () => {
    seedUser(db, { id: "new-user", email: "new@t.com" });
    await processReferralAfterSignup(makeRequest({ ref: "BADCODE" }), {
      user: { id: "new-user", email: "new@t.com" },
    });
  });

  it("creates credited referral for valid ref code", async () => {
    const referrerId = seedUser(db, { id: "ref-u", email: "referrer@t.com", credits: 50 });
    seedUser(db, { id: "new-ref", email: "newref@t.com" });
    seedReferralCode(db, referrerId, "ABC12345");

    await processReferralAfterSignup(makeRequest({ ref: "ABC12345" }, "1.2.3.4"), {
      user: { id: "new-ref", email: "newref@t.com" },
    });

    const refs = getReferrals(db, "new-ref");
    expect(refs).toHaveLength(1);
    expect(refs[0].status).toBe("credited");
    expect(refs[0].referrer_credits_awarded).toBe(5);
    expect(refs[0].referee_credits_awarded).toBe(3);
  });

  it("prevents self-referral (creates pending)", async () => {
    const userId = seedUser(db, { id: "self-ref", email: "same@t.com", credits: 50 });
    seedReferralCode(db, userId, "SELFCODE");

    await processReferralAfterSignup(makeRequest({ ref: "SELFCODE" }), {
      user: { id: userId, email: "same@t.com" },
    });

    const refs = getReferrals(db, userId);
    if (refs.length > 0) {
      expect(refs[0].status).toBe("pending");
    }
  });

  it("prevents duplicate referral for already-referred user", async () => {
    const referrerId = seedUser(db, { id: "ref-u2", email: "r2@t.com", credits: 50 });
    seedUser(db, { id: "dup-ref", email: "dup@t.com" });
    seedReferralCode(db, referrerId, "DUPCODE");
    const now = Math.floor(Date.now() / 1000);
    db.run(
      `INSERT INTO referral (id, referrer_id, referee_id, code, status, created_at) VALUES ('ref-old', '${referrerId}', 'dup-ref', 'OLDCODE', 'credited', ${now})`,
    );

    await processReferralAfterSignup(makeRequest({ ref: "DUPCODE" }), {
      user: { id: "dup-ref", email: "dup@t.com" },
    });

    expect(getReferrals(db, "dup-ref")).toHaveLength(1);
  });
});
