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

        try {
          // TODO: restore referralTier/totalReferrals after migration 0003 is applied
          const [creditSum] = await db
            .select({
              total: sql<number>`COALESCE(SUM(${referral.referrerCreditsAwarded}), 0)`.mapWith(
                Number,
              ),
            })
            .from(referral)
            .where(and(eq(referral.referrerId, userId), eq(referral.status, "credited")));

          const [commissionSum] = await db
            .select({
              total: sql<number>`COALESCE(SUM(${referral.purchaseCommissionAwarded}), 0)`.mapWith(
                Number,
              ),
            })
            .from(referral)
            .where(
              and(eq(referral.referrerId, userId), sql`${referral.purchaseCommissionAwarded} > 0`),
            );

          const [codeRecord] = await db
            .select({ code: referralCode.code })
            .from(referralCode)
            .where(eq(referralCode.userId, userId));

          return jsonResponse(
            {
              tier: "none",
              totalReferrals: 0,
              totalCreditsEarned: creditSum?.total ?? 0,
              commissionTotal: commissionSum?.total ?? 0,
              referralCode: codeRecord?.code ?? null,
              shareUrl: codeRecord ? `${new URL(request.url).origin}/r/${codeRecord.code}` : null,
            },
            200,
          );
        } catch (err) {
          console.error("[referral] stats error:", err);
          return jsonResponse(
            {
              tier: "none",
              totalReferrals: 0,
              totalCreditsEarned: 0,
              commissionTotal: 0,
              referralCode: null,
              shareUrl: null,
            },
            200,
          );
        }
      },
    },
  },
});
