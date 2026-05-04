import "@tanstack/react-start/server-only";
import type { BetterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { env } from "@/env/server";
import { getDb } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import * as schema from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

let _auth: BetterAuth | null = null;

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
        sendEmailVerification: async ({ user, url }) => {
          console.log("[auth] Verification email:", user.email, url);
        },
        sendResetPassword: async ({ user, url }) => {
          console.log("[auth] Reset email:", user.email, url);
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
