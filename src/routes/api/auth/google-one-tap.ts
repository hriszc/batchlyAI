import { createFileRoute } from "@tanstack/react-router";

import { env } from "@/env/server";
import { jsonResponse, requireValidOrigin } from "@/lib/api-helpers";
import { createAuth } from "@/lib/auth/auth";
import { recordCreditGrant } from "@/lib/credits/audit";
import { SIGNUP_FREE_CREDITS } from "@/lib/credits/constants";
import { getDb } from "@/lib/db";
import { user as userTable, account as accountTable } from "@/lib/db/schema/auth.schema";

async function verifyGoogleToken(credential: string) {
  const resp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
  if (!resp.ok) return null;
  return (await resp.json()) as {
    email: string;
    name: string;
    picture: string;
    sub: string;
    email_verified: string | boolean;
    aud: string;
    iss: string;
    exp: string;
  };
}

function getD1Binding(): D1Database | undefined {
  const platformEnv = (globalThis as Record<string, unknown>).__env__ as
    | Record<string, unknown>
    | undefined;
  return platformEnv?.batchlyai_db as D1Database | undefined;
}

function generateId() {
  return crypto.randomUUID();
}

export const Route = createFileRoute("/api/auth/google-one-tap")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const originError = requireValidOrigin(request);
        if (originError) return originError;

        const auth = createAuth();
        if (!auth) {
          return jsonResponse({ error: "Auth not available" }, 501);
        }

        let body: { credential: string };
        try {
          body = (await request.json()) as { credential: string };
        } catch {
          return jsonResponse({ error: "Invalid JSON" }, 400);
        }

        if (!body.credential) {
          return jsonResponse({ error: "Missing credential" }, 400);
        }

        const token = await verifyGoogleToken(body.credential);
        if (!token?.email) {
          return jsonResponse({ error: "Invalid Google credential" }, 401);
        }
        const expiresAt = Number.parseInt(token.exp, 10);
        const validIssuer =
          token.iss === "accounts.google.com" || token.iss === "https://accounts.google.com";
        const emailVerified = token.email_verified === true || token.email_verified === "true";
        if (
          !env.GOOGLE_CLIENT_ID ||
          token.aud !== env.GOOGLE_CLIENT_ID ||
          !validIssuer ||
          !Number.isFinite(expiresAt) ||
          expiresAt <= Math.floor(Date.now() / 1000) ||
          !emailVerified
        ) {
          return jsonResponse({ error: "Invalid Google credential" }, 401);
        }

        try {
          // Try better-auth's idToken social sign-in first
          const result = (await auth.api.signInSocial({
            body: {
              provider: "google",
              idToken: {
                token: body.credential,
              },
            },
            headers: request.headers,
            asResponse: true,
          })) as Response;

          if (result.ok) return result;
        } catch {
          // Fall through to manual handling
        }

        // Fallback: manually find/create user and session
        const binding = getD1Binding();
        if (!binding) {
          return jsonResponse({ error: "Database not available" }, 501);
        }

        const db = getDb(binding);

        const existingAccount = await db.query.account.findFirst({
          where: (fields, { eq, and }) =>
            and(eq(fields.providerId, "google"), eq(fields.accountId, token.sub)),
        });

        let userId: string;
        let createdUser = false;

        if (existingAccount) {
          userId = existingAccount.userId;
        } else {
          const existingUser = await db.query.user.findFirst({
            where: (fields, { eq }) => eq(fields.email, token.email),
          });

          if (existingUser) {
            userId = existingUser.id;
            await db.insert(accountTable).values({
              id: generateId(),
              userId,
              providerId: "google",
              accountId: token.sub,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          } else {
            userId = generateId();
            createdUser = true;
            await db.insert(userTable).values({
              id: userId,
              name: token.name,
              email: token.email,
              emailVerified,
              image: token.picture,
              credits: SIGNUP_FREE_CREDITS,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            await db.insert(accountTable).values({
              id: generateId(),
              userId,
              providerId: "google",
              accountId: token.sub,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }

        if (createdUser) {
          await recordCreditGrant({
            db,
            userId,
            credits: SIGNUP_FREE_CREDITS,
            creditType: "free",
            source: "signup_free",
            sourceId: userId,
            metadata: { method: "google-one-tap" },
          }).catch((err) => console.error("[credit-audit] google signup grant error:", err));
        }

        const session = await auth.api.createSession({
          body: { userId } as Record<string, unknown>,
          headers: request.headers,
          asResponse: true,
        });

        return session as unknown as Response;
      },
    },
  },
});
