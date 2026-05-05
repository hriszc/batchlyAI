import "@tanstack/react-start/server-only";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { env } from "@/env/server";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _auth: any = null;

function getD1Binding(): D1Database | undefined {
  const platformEnv = (globalThis as Record<string, unknown>).__env__ as
    | Record<string, unknown>
    | undefined;
  return platformEnv?.batchlyai_db as D1Database | undefined;
}

export function createAuth(d1Binding?: D1Database) {
  if (_auth) return _auth;

  const binding = d1Binding ?? getD1Binding();
  if (!binding) return null;

  if (env.BETTER_AUTH_SECRET === "dev-secret") {
    console.error(
      "[auth] FATAL: BETTER_AUTH_SECRET is the dev default. Set a real secret via `wrangler secret put BETTER_AUTH_SECRET`.",
    );
    return null;
  }

  try {
    const db = getDb(binding);

    _auth = betterAuth({
      baseURL: env.VITE_BASE_URL,
      telemetry: { enabled: false },
      database: drizzleAdapter(db, { provider: "sqlite", schema }),
      plugins: [tanstackStartCookies()],
      session: {
        cookieCache: {
          enabled: true,
          maxAge: 5 * 60,
        },
      },
      socialProviders: {
        ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
          ? {
              github: {
                clientId: env.GITHUB_CLIENT_ID,
                clientSecret: env.GITHUB_CLIENT_SECRET,
              },
            }
          : {}),
        ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
          ? {
              google: {
                clientId: env.GOOGLE_CLIENT_ID,
                clientSecret: env.GOOGLE_CLIENT_SECRET,
              },
            }
          : {}),
      },
      emailAndPassword: {
        enabled: true,
        password: {
          hash: hashPassword,
          verify: verifyPassword,
        },
        sendEmailVerification: async ({ user, url }: { user: { email: string }; url: string }) => {
          await sendEmail({
            to: user.email,
            subject: "Verify your BatchlyAI email",
            html: `<p>Click the link below to verify your email address:</p><p><a href="${url}">${url}</a></p>`,
          });
        },
        sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) => {
          await sendEmail({
            to: user.email,
            subject: "Reset your BatchlyAI password",
            html: `<p>Click the link below to reset your password:</p><p><a href="${url}">${url}</a></p>`,
          });
        },
      },
    });

    return _auth;
  } catch (err) {
    console.error("[auth] Failed to create auth instance:", err);
    return null;
  }
}

export function getAuth() {
  return _auth;
}
