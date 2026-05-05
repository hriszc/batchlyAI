import { createFileRoute } from "@tanstack/react-router";
import { and, eq, sql } from "drizzle-orm";

import { env } from "@/env/server";
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
  if (!binding) {
    return new Response(JSON.stringify({ error: "DB unavailable" }), {
      status: 501,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature") || "";

  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let event;
  try {
    const stripe = getStripe();
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signature verification failed";
    console.error("[stripe] webhook signature error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.userId;

    if (!userId) {
      console.error("[stripe] webhook: no userId in metadata");
      return new Response(JSON.stringify({ error: "Missing userId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const amountTotal = session.amount_total ?? 1000;
    const creditsPerDollar = 100; // $10 = 1000 credits → 100 credits per dollar
    const creditsGranted = Math.round((amountTotal / 100) * creditsPerDollar);
    const now = Math.floor(Date.now() / 1000);
    const db = getDb(binding);

    try {
      // Insert purchase record (idempotent — PK prevents duplicates)
      await db.insert(creditPurchase).values({
        id: session.id,
        userId,
        amount: amountTotal,
        credits: creditsGranted,
        status: "completed",
        createdAt: now,
        completedAt: now,
      });

      // Credit the user
      await db
        .update(userTable)
        .set({ credits: sql`${userTable.credits} + ${creditsGranted}` })
        .where(eq(userTable.id, userId));

      // Set stripe_customer_id on first purchase
      if (session.customer) {
        await db
          .update(userTable)
          .set({ stripeCustomerId: session.customer as string })
          .where(eq(userTable.id, userId));
      }

      console.log(`[stripe] Credited ${creditsGranted} credits to user ${userId}`);

      // Referral purchase commission (first purchase only)
      try {
        const [refRecord] = await db
          .select()
          .from(referral)
          .where(and(eq(referral.refereeId, userId), eq(referral.purchaseCommissionAwarded, 0)));

        if (refRecord) {
          const [referrer] = await db
            .select({ referralTier: userTable.referralTier })
            .from(userTable)
            .where(eq(userTable.id, refRecord.referrerId));

          const tier = referrer?.referralTier ?? "none";
          const commissionRate = tier === "gold" ? 0.3 : tier === "silver" ? 0.25 : 0.2;
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

            console.log(
              `[stripe] Referral commission: ${commission} credits to user ${refRecord.referrerId}`,
            );
          }
        }
      } catch (refErr) {
        // Non-fatal: don't break purchase if commission fails
        console.error("[stripe] Referral commission error:", refErr);
      }
    } catch (err) {
      // PK violation = duplicate event, which is fine
      const message = err instanceof Error ? err.message : "";
      if (message.includes("UNIQUE constraint") || message.includes("SQLITE_CONSTRAINT")) {
        console.log(`[stripe] Duplicate webhook event ${session.id}, skipping`);
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      console.error("[stripe] webhook db error:", message);
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        return handleWebhook(request);
      },
    },
  },
});
