import { createFileRoute } from "@tanstack/react-router";

import { createAuth } from "@/lib/auth/auth";
import { getD1Binding } from "@/lib/cloudflare/bindings";
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
    email_verified: string;
  };
}

function generateId() {
  return crypto.randomUUID();
}

export const Route = createFileRoute("/api/auth/google-one-tap")({
  server: {
    handlers: {
      POST: async ({ request }) => {
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
            await db.insert(userTable).values({
              id: userId,
              name: token.name,
              email: token.email,
              emailVerified: token.email_verified === "true",
              image: token.picture,
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

function jsonResponse(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
