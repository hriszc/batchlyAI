import { and, eq, gte, lte, sql } from "drizzle-orm";

import type { getDb } from "@/lib/db";
import { creditAuditEvent } from "@/lib/db/schema";

type Db = ReturnType<typeof getDb>;

export type CreditGrantSource =
  | "signup_free"
  | "referral_free"
  | "referral_purchase_commission"
  | "stripe_purchase"
  | "admin_adjustment";

export interface RecordCreditGrantInput {
  db: Db;
  userId: string;
  credits: number;
  creditType: "free" | "paid";
  source: CreditGrantSource;
  sourceId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface RecordAiCreditSpendInput {
  db: Db;
  userId: string;
  credits: number;
  sourceId?: string | null;
  provider: "deepseek" | "replicate" | "grsai" | "workers-ai";
  model: string;
  apiCallCount: number;
  status?: "succeeded" | "failed" | "refunded";
  metadata?: Record<string, unknown>;
}

export interface CreditBalanceBreakdown {
  freeCreditsRemaining: number;
  paidCreditsRemaining: number;
  anomalyReason: string | null;
}

function nowSecs(): number {
  return Math.floor(Date.now() / 1000);
}

function auditId(prefix: string): string {
  return `${prefix}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
}

function encodeMetadata(metadata: Record<string, unknown> | undefined): string | null {
  if (!metadata) return null;
  return JSON.stringify(metadata);
}

export async function recordCreditGrant(input: RecordCreditGrantInput): Promise<void> {
  await input.db.insert(creditAuditEvent).values({
    id: auditId("grant"),
    userId: input.userId,
    eventType: "grant",
    creditType: input.creditType,
    creditsDelta: input.credits,
    source: input.source,
    sourceId: input.sourceId ?? null,
    status: "succeeded",
    metadata: encodeMetadata(input.metadata),
    createdAt: nowSecs(),
  });
}

export async function getCreditBalanceBreakdown(
  db: Db,
  userId: string,
): Promise<CreditBalanceBreakdown> {
  const [row] = await db
    .select({
      freeGranted:
        sql<number>`COALESCE(SUM(CASE WHEN ${creditAuditEvent.eventType} = 'grant' AND ${creditAuditEvent.creditType} = 'free' THEN ${creditAuditEvent.creditsDelta} ELSE 0 END), 0)`.mapWith(
          Number,
        ),
      paidGranted:
        sql<number>`COALESCE(SUM(CASE WHEN ${creditAuditEvent.eventType} = 'grant' AND ${creditAuditEvent.creditType} = 'paid' THEN ${creditAuditEvent.creditsDelta} ELSE 0 END), 0)`.mapWith(
          Number,
        ),
      freeSpent:
        sql<number>`COALESCE(SUM(CASE WHEN ${creditAuditEvent.eventType} = 'spend' THEN ${creditAuditEvent.freeCreditsUsed} ELSE 0 END), 0)`.mapWith(
          Number,
        ),
      paidSpent:
        sql<number>`COALESCE(SUM(CASE WHEN ${creditAuditEvent.eventType} = 'spend' THEN ${creditAuditEvent.paidCreditsUsed} ELSE 0 END), 0)`.mapWith(
          Number,
        ),
    })
    .from(creditAuditEvent)
    .where(eq(creditAuditEvent.userId, userId));

  const freeCreditsRemaining = Math.max(0, (row?.freeGranted ?? 0) - (row?.freeSpent ?? 0));
  const paidCreditsRemaining = Math.max(0, (row?.paidGranted ?? 0) - (row?.paidSpent ?? 0));
  const hasKnownGrant = (row?.freeGranted ?? 0) + (row?.paidGranted ?? 0) > 0;

  return {
    freeCreditsRemaining,
    paidCreditsRemaining,
    anomalyReason: hasKnownGrant ? null : "legacy_or_missing_credit_grant",
  };
}

export async function recordAiCreditSpend(input: RecordAiCreditSpendInput): Promise<void> {
  if (input.status === "refunded") {
    await input.db.insert(creditAuditEvent).values({
      id: auditId("spend"),
      userId: input.userId,
      eventType: "spend",
      creditType: "none",
      creditsDelta: 0,
      freeCreditsUsed: 0,
      paidCreditsUsed: 0,
      source: "ai_api",
      sourceId: input.sourceId ?? null,
      provider: input.provider,
      model: input.model,
      apiCallCount: 0,
      status: "refunded",
      metadata: encodeMetadata(input.metadata),
      createdAt: nowSecs(),
    });
    return;
  }

  const breakdown = await getCreditBalanceBreakdown(input.db, input.userId);
  const freeCreditsUsed = Math.min(input.credits, breakdown.freeCreditsRemaining);
  const paidCreditsUsed = Math.max(0, input.credits - freeCreditsUsed);
  const creditType =
    freeCreditsUsed > 0 && paidCreditsUsed > 0 ? "mixed" : freeCreditsUsed > 0 ? "free" : "paid";
  const anomalyReason =
    breakdown.anomalyReason ??
    (paidCreditsUsed > breakdown.paidCreditsRemaining ? "missing_paid_credit_grant" : null);

  await input.db.insert(creditAuditEvent).values({
    id: auditId("spend"),
    userId: input.userId,
    eventType: "spend",
    creditType,
    creditsDelta: -input.credits,
    freeCreditsUsed,
    paidCreditsUsed,
    source: "ai_api",
    sourceId: input.sourceId ?? null,
    provider: input.provider,
    model: input.model,
    apiCallCount: input.apiCallCount,
    status: input.status ?? "succeeded",
    anomalyReason,
    metadata: encodeMetadata(input.metadata),
    createdAt: nowSecs(),
  });
}

export interface GetDailyAiUsageInput {
  db: Db;
  fromSecs: number;
  toSecs: number;
}

export async function getDailyAiUsage(input: GetDailyAiUsageInput) {
  return input.db
    .select({
      day: sql<string>`date(${creditAuditEvent.createdAt}, 'unixepoch')`,
      provider: creditAuditEvent.provider,
      model: creditAuditEvent.model,
      apiCallCount: sql<number>`COALESCE(SUM(${creditAuditEvent.apiCallCount}), 0)`.mapWith(Number),
      creditsUsed: sql<number>`COALESCE(SUM(ABS(${creditAuditEvent.creditsDelta})), 0)`.mapWith(
        Number,
      ),
      freeCreditsUsed: sql<number>`COALESCE(SUM(${creditAuditEvent.freeCreditsUsed}), 0)`.mapWith(
        Number,
      ),
      paidCreditsUsed: sql<number>`COALESCE(SUM(${creditAuditEvent.paidCreditsUsed}), 0)`.mapWith(
        Number,
      ),
      anomalousEvents:
        sql<number>`COALESCE(SUM(CASE WHEN ${creditAuditEvent.anomalyReason} IS NOT NULL THEN 1 ELSE 0 END), 0)`.mapWith(
          Number,
        ),
    })
    .from(creditAuditEvent)
    .where(
      and(
        eq(creditAuditEvent.eventType, "spend"),
        gte(creditAuditEvent.createdAt, input.fromSecs),
        lte(creditAuditEvent.createdAt, input.toSecs),
      ),
    )
    .groupBy(
      sql`date(${creditAuditEvent.createdAt}, 'unixepoch')`,
      creditAuditEvent.provider,
      creditAuditEvent.model,
    )
    .orderBy(sql`date(${creditAuditEvent.createdAt}, 'unixepoch')`);
}
