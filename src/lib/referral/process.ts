import { and, eq, gte, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { referral as referralTable, referralCode, user as userTable } from "@/lib/db/schema";
import { getD1Binding, getKvBinding } from "@/lib/cloudflare/bindings";

const REFERRER_CREDITS = 5;
const REFEREE_CREDITS = 3;
const DAILY_CAP = 50;

export async function processReferralAfterSignup(
  request: Request,
  signupResult: { user?: { id: string; email: string } },
): Promise<void> {
  const userId = signupResult?.user?.id;
  const userEmail = signupResult?.user?.email;
  if (!userId || !userEmail) return;

  let refCode: string | undefined;
  try {
    const clonedReq = request.clone();
    const body = (await clonedReq.json()) as Record<string, unknown>;
    refCode = (body?.ref as string)?.trim();
  } catch {
    return;
  }
  if (!refCode) return;

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";

  const binding = getD1Binding();
  if (!binding) return;
  const db = getDb(binding);

  // Look up referrer by code
  const [codeRecord] = await db.select().from(referralCode).where(eq(referralCode.code, refCode));
  if (!codeRecord) return;

  const referrerId = codeRecord.userId;

  // Self-referral: compare emails
  const [referrer] = await db
    .select({ email: userTable.email })
    .from(userTable)
    .where(eq(userTable.id, referrerId));
  if (!referrer) return;

  const normalizedReferrer = referrer.email.toLowerCase().replace(/\+.*@/, "@");
  const normalizedReferee = userEmail.toLowerCase().replace(/\+.*@/, "@");
  const isSelfReferral = normalizedReferrer === normalizedReferee;

  // Check if referee already referred (UNIQUE constraint)
  const [existing] = await db
    .select({ id: referralTable.id })
    .from(referralTable)
    .where(eq(referralTable.refereeId, userId));
  if (existing) return;

  // Daily cap
  const todayStart = Math.floor(new Date(new Date().setHours(0, 0, 0, 0)).getTime() / 1000);
  const todayEnd = todayStart + 86400;
  const [todayCount] = await db
    .select({
      count: sql<number>`COUNT(*)`.mapWith(Number),
    })
    .from(referralTable)
    .where(
      and(
        eq(referralTable.referrerId, referrerId),
        gte(referralTable.createdAt, todayStart),
        sql`${referralTable.createdAt} < ${todayEnd}`,
      ),
    );

  const nowSecs = Math.floor(Date.now() / 1000);

  // If daily cap exceeded, create pending without crediting
  if ((todayCount?.count ?? 0) >= DAILY_CAP) {
    await db.insert(referralTable).values({
      id: `ref_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      referrerId,
      refereeId: userId,
      code: refCode,
      status: "pending",
      ipAddress: ip,
      createdAt: nowSecs,
    });
    return;
  }

  // IP frequency via KV
  let needsExtendedPending = isSelfReferral;
  const kv = getKvBinding();
  if (kv && ip !== "unknown") {
    const kvKey = `rate:signup:${ip}`;
    const count = parseInt((await kv.get(kvKey)) || "0", 10);
    if (count >= 3) {
      needsExtendedPending = true;
    }
    await kv.put(kvKey, String(count + 1), { expirationTtl: 86400 });
  }

  const refId = `ref_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  if (needsExtendedPending) {
    // 72h pending for suspicious
    await db.insert(referralTable).values({
      id: refId,
      referrerId,
      refereeId: userId,
      code: refCode,
      status: "pending",
      ipAddress: ip,
      referrerCreditsAwarded: REFERRER_CREDITS,
      refereeCreditsAwarded: REFEREE_CREDITS,
      createdAt: nowSecs,
    });
    return;
  }

  // Normal referral: credit immediately
  await db.insert(referralTable).values({
    id: refId,
    referrerId,
    refereeId: userId,
    code: refCode,
    status: "credited",
    ipAddress: ip,
    referrerCreditsAwarded: REFERRER_CREDITS,
    refereeCreditsAwarded: REFEREE_CREDITS,
    createdAt: nowSecs,
    creditedAt: nowSecs,
  });

  // Credit both parties
  await db
    .update(userTable)
    .set({ credits: sql`${userTable.credits} + ${REFERRER_CREDITS}` })
    .where(eq(userTable.id, referrerId));

  await db
    .update(userTable)
    .set({ credits: sql`${userTable.credits} + ${REFEREE_CREDITS}` })
    .where(eq(userTable.id, userId));

  // TODO: re-enable tier tracking after migration 0003 is applied
  // const [referrerRecord] = await db
  //   .select({ totalReferrals: userTable.totalReferrals })
  //   .from(userTable)
  //   .where(eq(userTable.id, referrerId));
  //
  // const newTotal = (referrerRecord?.totalReferrals ?? 0) + 1;
  // const newTier =
  //   newTotal >= 21 ? "gold" : newTotal >= 6 ? "silver" : newTotal >= 1 ? "bronze" : "none";
  //
  // await db
  //   .update(userTable)
  //   .set({ totalReferrals: newTotal, referralTier: newTier })
  //   .where(eq(userTable.id, referrerId));
}
