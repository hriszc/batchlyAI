import { createFileRoute } from "@tanstack/react-router";
import { and, eq, sql } from "drizzle-orm";

import { env } from "@/env/server";
import { jsonResponse } from "@/lib/api-helpers";
import { recordCreditGrant } from "@/lib/credits/audit";
import { getDb } from "@/lib/db";
import { user as userTable, creditPurchase, referral } from "@/lib/db/schema";
import { getStripe } from "@/lib/stripe";

function getCreditsPerPrice(priceId: string): number | null {
  const catalog = [
    [env.STRIPE_PRICE_ID_USD, 1000],
    [env.STRIPE_PRICE_ID_CNY, 1000],
  ] as const;
  for (const [configuredPrice, creditsPerPack] of catalog) {
    if (configuredPrice && configuredPrice === priceId) {
      return creditsPerPack;
    }
  }
  return null;
}

function getD1Binding(): D1Database | undefined {
  const platformEnv = (globalThis as Record<string, unknown>).__env__ as
    | Record<string, unknown>
    | undefined;
  return platformEnv?.batchlyai_db as D1Database | undefined;
}

export async function handleWebhook(request: Request): Promise<Response> {
  const binding = getD1Binding();
  if (!binding) return jsonResponse({ error: "DB unavailable" }, 501);

  const body = await request.text();
  const sig = request.headers.get("stripe-signature") || "";

  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return jsonResponse({ error: "Webhook secret not configured" }, 500);

  let event;
  try {
    const stripe = getStripe();
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signature verification failed";
    console.error("[stripe] webhook signature error:", message);
    return jsonResponse({ error: "Webhook verification failed" }, 400);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.userId;

    if (!userId) {
      console.error("[stripe] webhook: no userId in metadata");
      return jsonResponse({ error: "Missing userId" }, 400);
    }

    if (session.payment_status !== "paid") {
      return jsonResponse({ received: true }, 200);
    }

    if (session.status !== "complete") {
      return jsonResponse({ received: true }, 200);
    }

    const stripe = getStripe();
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
    const totalCredits = lineItems.data.reduce((sum, item) => {
      const priceId = item.price?.id;
      const creditsPerUnit = priceId ? getCreditsPerPrice(priceId) : null;
      if (!creditsPerUnit) return sum;
      return sum + creditsPerUnit * (item.quantity ?? 1);
    }, 0);

    if (totalCredits <= 0) {
      console.error("[stripe] webhook: no recognized line items");
      return jsonResponse({ error: "Unsupported purchase" }, 400);
    }

    const amountTotal = session.amount_total ?? 0;
    const now = Math.floor(Date.now() / 1000);
    const db = getDb(binding);

    try {
      await db.insert(creditPurchase).values({
        id: session.id,
        userId,
        amount: amountTotal,
        credits: totalCredits,
        status: "completed",
        createdAt: now,
        completedAt: now,
      });

      await db
        .update(userTable)
        .set({ credits: sql`${userTable.credits} + ${totalCredits}` })
        .where(eq(userTable.id, userId));
      await recordCreditGrant({
        db,
        userId,
        credits: totalCredits,
        creditType: "paid",
        source: "stripe_purchase",
        sourceId: session.id,
        metadata: { amountTotal, currency: session.currency ?? null },
      }).catch((err) => console.error("[credit-audit] stripe grant error:", err));

      if (session.customer) {
        await db
          .update(userTable)
          .set({ stripeCustomerId: session.customer as string })
          .where(eq(userTable.id, userId));
      }

      console.log(`[stripe] Credited ${totalCredits} credits`);

      // Analytics (non-blocking)
      void (async () => {
        const [userRecord] = await db
          .select({ stripeCustomerId: userTable.stripeCustomerId })
          .from(userTable)
          .where(eq(userTable.id, userId))
          .limit(1);
        const { trackServer } = await import("@/lib/analytics/server");
        await trackServer("purchase_completed", userId, {
          amount_cents: amountTotal,
          credits_granted: totalCredits,
          is_first_purchase: !userRecord?.stripeCustomerId,
        });
      })();

      // Referral purchase commission (first purchase only)
      try {
        const [refRecord] = await db
          .select()
          .from(referral)
          .where(and(eq(referral.refereeId, userId), eq(referral.purchaseCommissionAwarded, 0)));

        if (refRecord) {
          const commissionRate = 0.2;
          const commission = Math.round(totalCredits * commissionRate);

          if (commission > 0) {
            await db
              .update(userTable)
              .set({ credits: sql`${userTable.credits} + ${commission}` })
              .where(eq(userTable.id, refRecord.referrerId));

            await db
              .update(referral)
              .set({ purchaseCommissionAwarded: commission })
              .where(eq(referral.id, refRecord.id));
            await recordCreditGrant({
              db,
              userId: refRecord.referrerId,
              credits: commission,
              creditType: "free",
              source: "referral_purchase_commission",
              sourceId: refRecord.id,
              metadata: { refereeId: userId, checkoutSessionId: session.id },
            }).catch((err) =>
              console.error("[credit-audit] referral commission grant error:", err),
            );

            console.log(`[stripe] Referral commission: ${commission} credits awarded`);
          }
        }
      } catch (refErr) {
        console.error("[stripe] Referral commission error:", refErr);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("UNIQUE constraint") || message.includes("SQLITE_CONSTRAINT")) {
        console.log(`[stripe] Duplicate webhook event ${session.id}, skipping`);
        return jsonResponse({ received: true }, 200);
      }
      console.error("[stripe] webhook db error:", message);
      return jsonResponse({ error: message }, 500);
    }
  }

  return jsonResponse({ received: true }, 200);
}

export const Route = createFileRoute("/api/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => handleWebhook(request),
    },
  },
});
