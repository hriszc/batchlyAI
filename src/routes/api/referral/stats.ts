import { createFileRoute } from "@tanstack/react-router";
import { and, eq, sql } from "drizzle-orm";

import { jsonResponse } from "@/lib/api-helpers";
import { createAuth } from "@/lib/auth/auth";
import { getDb } from "@/lib/db";
import { referral, referralCode, user as userTable } from "@/lib/db/schema";

function getD1Binding(): D1Database | undefined {
  const platformEnv = (globalThis as Record<string, unknown>).__env__ as
    | Record<string, unknown>
    | undefined;
  return platformEnv?.batchlyai_db as D1Database | undefined;
}

export const Route = createFileRoute("/api/referral/stats")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = createAuth();
        if (!auth) return jsonResponse({ error: "Auth unavailable" }, 501);

        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user?.id) {
          return jsonResponse({ error: "Unauthorized" }, 401);
        }

        const userId = session.user.id;
        const binding = getD1Binding();
        if (!binding) return jsonResponse({ error: "DB unavailable" }, 501);
        const db = getDb(binding);

        const [userRecord] = await db
          .select({
            referralTier: userTable.referralTier,
            totalReferrals: userTable.totalReferrals,
          })
          .from(userTable)
          .where(eq(userTable.id, userId));

        // Sum referrer credits from all credited referrals
        const [creditSum] = await db
          .select({
            total: sql<number>`COALESCE(SUM(${referral.referrerCreditsAwarded}), 0)`
              .mapWith(Number),
          })
          .from(referral)
          .where(
            and(
              eq(referral.referrerId, userId),
              eq(referral.status, "credited"),
            ),
          );

        // Sum purchase commissions
        const [commissionSum] = await db
          .select({
            total: sql<number>`COALESCE(SUM(${referral.purchaseCommissionAwarded}), 0)`
              .mapWith(Number),
          })
          .from(referral)
          .where(
            and(
              eq(referral.referrerId, userId),
              sql`${referral.purchaseCommissionAwarded} > 0`,
            ),
          );

        // Look up referral code
        const [codeRecord] = await db
          .select({ code: referralCode.code })
          .from(referralCode)
          .where(eq(referralCode.userId, userId));

        return jsonResponse(
          {
            tier: userRecord?.referralTier ?? "none",
            totalReferrals: userRecord?.totalReferrals ?? 0,
            totalCreditsEarned: creditSum?.total ?? 0,
            commissionTotal: commissionSum?.total ?? 0,
            referralCode: codeRecord?.code ?? null,
            shareUrl: codeRecord
              ? `${new URL(request.url).origin}/r/${codeRecord.code}`
              : null,
          },
          200,
        );
      },
    },
  },
});
