import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";

import { jsonResponse } from "@/lib/api-helpers";
import { createAuth } from "@/lib/auth/auth";
import { getDb } from "@/lib/db";
import { referralCode, user as userTable } from "@/lib/db/schema";

function getD1Binding(): D1Database | undefined {
  const platformEnv = (globalThis as Record<string, unknown>).__env__ as
    | Record<string, unknown>
    | undefined;
  return platformEnv?.batchlyai_db as D1Database | undefined;
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const Route = createFileRoute("/api/referral/generate-code")({
  server: {
    handlers: {
      POST: async ({ request }) => {
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
          // Idempotent: return existing code
          const [existing] = await db
            .select()
            .from(referralCode)
            .where(eq(referralCode.userId, userId));

          if (existing) {
            const origin = new URL(request.url).origin;
            return jsonResponse(
              { code: existing.code, shareUrl: `${origin}/r/${existing.code}` },
              200,
            );
          }

          // Activity gate
          const [userRecord] = await db
            .select({ credits: userTable.credits })
            .from(userTable)
            .where(eq(userTable.id, userId));

          if (!userRecord || userRecord.credits >= 10) {
            return jsonResponse(
              {
                error: "You must generate at least one image before creating a referral link",
              },
              403,
            );
          }

          let code = "";
          for (let attempt = 0; attempt < 5; attempt++) {
            code = generateCode();
            const [collision] = await db
              .select({ id: referralCode.id })
              .from(referralCode)
              .where(eq(referralCode.code, code));
            if (!collision) break;
            if (attempt === 4) {
              return jsonResponse({ error: "Failed to generate unique code" }, 500);
            }
          }

          const now = Math.floor(Date.now() / 1000);
          await db.insert(referralCode).values({
            id: `refcode_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            userId,
            code,
            createdAt: now,
          });

          const origin = new URL(request.url).origin;
          return jsonResponse({ code, shareUrl: `${origin}/r/${code}` }, 200);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          // Table-not-found means the 0003 migration hasn't been applied yet.
          // Return a graceful error that doesn't alarm users.
          if (message.includes("no such table") || message.includes("does not exist")) {
            console.warn(
              "[referral] Referral tables not found. Run migration 0003 to enable referrals.",
            );
          } else {
            console.error("[referral] generate-code error:", err);
          }
          return jsonResponse({ error: "Referral feature coming soon" }, 503);
        }
      },
    },
  },
});
