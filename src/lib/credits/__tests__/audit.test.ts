import { eq } from "drizzle-orm";
import { describe, expect, it, beforeEach } from "vitest";

import { creditAuditEvent } from "@/lib/db/schema";
import type { getDb } from "@/lib/db";

import { applyMigrations, createTestDb, seedUser } from "#test/db-setup";
import {
  getCreditBalanceBreakdown,
  getDailyAiUsage,
  recordAiCreditSpend,
  recordCreditGrant,
} from "../audit";

describe("credit audit", () => {
  let db: ReturnType<typeof createTestDb>;
  let auditDb: ReturnType<typeof getDb>;
  let userId: string;

  beforeEach(() => {
    db = createTestDb();
    auditDb = db as unknown as ReturnType<typeof getDb>;
    applyMigrations(db);
    userId = seedUser(db, { id: "audit-user", credits: 100 });
  });

  it("tracks free and paid grants", async () => {
    await recordCreditGrant({
      db: auditDb,
      userId,
      credits: 40,
      creditType: "free",
      source: "signup_free",
    });
    await recordCreditGrant({
      db: auditDb,
      userId,
      credits: 1000,
      creditType: "paid",
      source: "stripe_purchase",
      sourceId: "cs_123",
    });

    const balance = await getCreditBalanceBreakdown(auditDb, userId);
    expect(balance.freeCreditsRemaining).toBe(40);
    expect(balance.paidCreditsRemaining).toBe(1000);
    expect(balance.anomalyReason).toBeNull();
  });

  it("spends free credits before paid credits", async () => {
    await recordCreditGrant({
      db: auditDb,
      userId,
      credits: 40,
      creditType: "free",
      source: "signup_free",
    });
    await recordCreditGrant({
      db: auditDb,
      userId,
      credits: 100,
      creditType: "paid",
      source: "stripe_purchase",
    });

    await recordAiCreditSpend({
      db: auditDb,
      userId,
      credits: 60,
      provider: "replicate",
      model: "z-image-fast",
      apiCallCount: 6,
    });

    const [spend] = await db
      .select()
      .from(creditAuditEvent)
      .where(eq(creditAuditEvent.eventType, "spend"));

    expect(spend.freeCreditsUsed).toBe(40);
    expect(spend.paidCreditsUsed).toBe(20);
    expect(spend.creditType).toBe("mixed");
  });

  it("marks missing credit source as anomalous", async () => {
    await recordAiCreditSpend({
      db: auditDb,
      userId,
      credits: 10,
      provider: "grsai",
      model: "z-image-pro",
      apiCallCount: 1,
    });

    const [spend] = await db
      .select()
      .from(creditAuditEvent)
      .where(eq(creditAuditEvent.eventType, "spend"));

    expect(spend.anomalyReason).toBe("legacy_or_missing_credit_grant");
  });

  it("aggregates daily AI usage", async () => {
    await recordCreditGrant({
      db: auditDb,
      userId,
      credits: 100,
      creditType: "paid",
      source: "stripe_purchase",
    });
    await recordAiCreditSpend({
      db: auditDb,
      userId,
      credits: 20,
      provider: "deepseek",
      model: "deepseek-v4-flash",
      apiCallCount: 4,
    });

    const now = Math.floor(Date.now() / 1000);
    const rows = await getDailyAiUsage({ db: auditDb, fromSecs: now - 60, toSecs: now + 60 });

    expect(rows).toEqual([
      expect.objectContaining({
        provider: "deepseek",
        model: "deepseek-v4-flash",
        apiCallCount: 4,
        creditsUsed: 20,
        paidCreditsUsed: 20,
      }),
    ]);
  });
});
