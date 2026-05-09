import "@tanstack/react-start/server-only";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { env } from "@/env/server";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getD1Binding } from "@/lib/cloudflare/bindings";
import { getDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _auth: any = null;

export function createAuth(d1Binding?: D1Database) {
  if (_auth) return _auth;

  const binding = d1Binding ?? getD1Binding();
  if (!binding) return null;

  if (env.BETTER_AUTH_SECRET === "dev-secret-do-not-use-in-production-42-characters-minimum") {
    console.error(
      "[auth] FATAL: BETTER_AUTH_SECRET is the public dev default. Set a real secret via `wrangler secret put BETTER_AUTH_SECRET`.",
    );
    return null;
  }

  try {
    const db = getDb(binding);

    _auth = betterAuth({
      baseURL: env.VITE_BASE_URL,
      telemetry: { enabled: false },
      trustedOrigins: [env.VITE_BASE_URL, "http://localhost:3000", "https://*.workers.dev"],
      database: drizzleAdapter(db, { provider: "sqlite", schema }),
      plugins: [tanstackStartCookies()],
      user: {
        additionalFields: {
          credits: {
            type: "number",
            defaultValue: 40,
          },
        },
      },
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
        requireEmailVerification: true,
        password: {
          hash: hashPassword,
          verify: verifyPassword,
        },
        sendResetPassword: async ({
          user,
          url,
        }: {
          user: { email: string; name?: string };
          url: string;
        }) => {
          await sendEmail({
            to: user.email,
            subject: "Reset your password — BatchlyAI",
            html: [
              "<h1>Password Reset Request</h1>",
              "<p>Click the link below to reset your password:</p>",
              `<p><a href="${url}">Reset Password</a></p>`,
              "<p>This link expires in 1 hour.</p>",
              "<p>If you did not request a password reset, please ignore this email.</p>",
            ].join(""),
          });
        },
      },
      emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ({
          user,
          url,
        }: {
          user: { email: string; name?: string };
          url: string;
          token: string;
        }) => {
          await sendEmail({
            to: user.email,
            subject: "Verify your email — BatchlyAI",
            html: [
              `<h1>Welcome to BatchlyAI${user.name ? `, ${user.name}` : ""}!</h1>`,
              "<p>Please verify your email address by clicking the link below:</p>",
              `<p><a href="${url}">Verify Email</a></p>`,
              "<p>This link expires in 1 hour.</p>",
              "<p>If you did not create this account, please ignore this email.</p>",
            ].join(""),
          }).catch((err) => console.error("[auth] sendVerificationEmail failed:", err));
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
