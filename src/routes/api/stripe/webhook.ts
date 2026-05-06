import { createFileRoute } from "@tanstack/react-router";
import { and, eq, sql } from "drizzle-orm";

import { env } from "@/env/server";
import { jsonResponse } from "@/lib/api-helpers";
import { getDb } from "@/lib/db";
import { user as userTable, creditPurchase, referral } from "@/lib/db/schema";
import { getStripe } from "@/lib/stripe";

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
    return jsonResponse({ error: message }, 400);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.userId;

    if (!userId) {
      console.error("[stripe] webhook: no userId in metadata");
      return jsonResponse({ error: "Missing userId" }, 400);
    }

    const amountTotal = session.amount_total ?? 1000;
    const creditsPerDollar = 100;
    const creditsGranted = Math.round((amountTotal / 100) * creditsPerDollar);
    const now = Math.floor(Date.now() / 1000);
    const db = getDb(binding);

    try {
      await db.insert(creditPurchase).values({
        id: session.id,
        userId,
        amount: amountTotal,
        credits: creditsGranted,
        status: "completed",
        createdAt: now,
        completedAt: now,
      });

      await db
        .update(userTable)
        .set({ credits: sql`${userTable.credits} + ${creditsGranted}` })
        .where(eq(userTable.id, userId));

      if (session.customer) {
        await db
          .update(userTable)
          .set({ stripeCustomerId: session.customer as string })
          .where(eq(userTable.id, userId));
      }

      console.log(`[stripe] Credited ${creditsGranted} credits`);

      // Referral purchase commission (first purchase only)
      try {
        const [refRecord] = await db
          .select()
          .from(referral)
          .where(and(eq(referral.refereeId, userId), eq(referral.purchaseCommissionAwarded, 0)));

        if (refRecord) {
          const commissionRate = 0.2;
          const commission = Math.round(creditsGranted * commissionRate);

          if (commission > 0) {
            await db
              .update(userTable)
              .set({ credits: sql`${userTable.credits} + ${commission}` })
              .where(eq(userTable.id, refRecord.referrerId));

            await db
              .update(referral)
              .set({ purchaseCommissionAwarded: commission })
              .where(eq(referral.id, refRecord.id));

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
