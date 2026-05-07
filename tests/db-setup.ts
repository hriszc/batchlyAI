import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "@/lib/db/schema";

export function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema, casing: "snake_case" });
}

export function applyMigrations(db: ReturnType<typeof createTestDb>) {
  // Run the Drizzle migrations programmatically
  db.run(`CREATE TABLE "user" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "email" text NOT NULL,
    "email_verified" integer DEFAULT false NOT NULL,
    "image" text,
    "credits" integer DEFAULT 10 NOT NULL,
    "stripe_customer_id" text,
    "referral_tier" text DEFAULT 'none' NOT NULL,
    "total_referrals" integer DEFAULT 0 NOT NULL,
    "created_at" integer NOT NULL,
    "updated_at" integer NOT NULL
  )`);
  db.run(`CREATE UNIQUE INDEX "user_email_unique" ON "user" ("email")`);

  db.run(`CREATE TABLE "session" (
    "id" text PRIMARY KEY NOT NULL,
    "expires_at" integer NOT NULL,
    "token" text NOT NULL,
    "created_at" integer NOT NULL,
    "updated_at" integer NOT NULL,
    "ip_address" text,
    "user_agent" text,
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
  )`);
  db.run(`CREATE UNIQUE INDEX "session_token_unique" ON "session" ("token")`);
  db.run(`CREATE INDEX "session_userId_idx" ON "session" ("user_id")`);

  db.run(`CREATE TABLE "account" (
    "id" text PRIMARY KEY NOT NULL,
    "account_id" text NOT NULL,
    "provider_id" text NOT NULL,
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "access_token" text,
    "refresh_token" text,
    "id_token" text,
    "access_token_expires_at" integer,
    "refresh_token_expires_at" integer,
    "scope" text,
    "password" text,
    "created_at" integer NOT NULL,
    "updated_at" integer NOT NULL
  )`);
  db.run(`CREATE INDEX "account_userId_idx" ON "account" ("user_id")`);

  db.run(`CREATE TABLE "verification" (
    "id" text PRIMARY KEY NOT NULL,
    "identifier" text NOT NULL,
    "value" text NOT NULL,
    "expires_at" integer NOT NULL,
    "created_at" integer NOT NULL,
    "updated_at" integer NOT NULL
  )`);
  db.run(`CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier")`);

  // Referral tables (migration 0003)
  db.run(`CREATE TABLE "referral_code" (
    "id" text PRIMARY KEY NOT NULL,
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "code" text NOT NULL,
    "created_at" integer NOT NULL
  )`);
  db.run(`CREATE UNIQUE INDEX "referral_code_user_id_unique" ON "referral_code" ("user_id")`);
  db.run(`CREATE UNIQUE INDEX "referral_code_code_unique" ON "referral_code" ("code")`);

  db.run(`CREATE TABLE "referral" (
    "id" text PRIMARY KEY NOT NULL,
    "referrer_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "referee_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "code" text NOT NULL,
    "status" text DEFAULT 'pending' NOT NULL,
    "referrer_credits_awarded" integer DEFAULT 0 NOT NULL,
    "referee_credits_awarded" integer DEFAULT 0 NOT NULL,
    "purchase_commission_awarded" integer DEFAULT 0 NOT NULL,
    "ip_address" text,
    "created_at" integer NOT NULL,
    "credited_at" integer
  )`);
  db.run(`CREATE UNIQUE INDEX "referral_referee_id_unique" ON "referral" ("referee_id")`);
  db.run(`CREATE INDEX "referral_referrer_id_idx" ON "referral" ("referrer_id")`);
  db.run(`CREATE INDEX "referral_referee_id_idx" ON "referral" ("referee_id")`);

  // Share table
  db.run(`CREATE TABLE "shared_batch" (
    "id" text PRIMARY KEY NOT NULL,
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "prompt_template" text NOT NULL,
    "variable_groups" text NOT NULL,
    "result_image_urls" text NOT NULL,
    "model" text NOT NULL,
    "aspect_ratio" text NOT NULL,
    "created_at" integer NOT NULL
  )`);

  // Generation table
  db.run(`CREATE TABLE "generation" (
    "id" text PRIMARY KEY NOT NULL,
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "prompt_template" text NOT NULL,
    "resolved_prompts" text NOT NULL,
    "variable_groups" text NOT NULL,
    "result_urls" text NOT NULL,
    "model" text NOT NULL,
    "credits_used" integer NOT NULL,
    "created_at" integer NOT NULL
  )`);
  db.run(`CREATE INDEX "generation_user_idx" ON "generation" ("user_id")`);
  db.run(`CREATE INDEX "generation_created_idx" ON "generation" ("created_at")`);

  // Saved prompts table
  db.run(`CREATE TABLE "saved_prompt" (
    "id" text PRIMARY KEY NOT NULL,
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "name" text NOT NULL,
    "prompt_template" text NOT NULL,
    "variable_groups" text,
    "model" text,
    "tags" text,
    "usage_count" integer DEFAULT 0,
    "created_at" integer NOT NULL,
    "updated_at" integer NOT NULL
  )`);
  db.run(`CREATE INDEX "saved_prompt_user_idx" ON "saved_prompt" ("user_id")`);

  // Payment tables
  db.run(`CREATE TABLE "credit_purchase" (
    "id" text PRIMARY KEY NOT NULL,
    "user_id" text NOT NULL REFERENCES "user"("id"),
    "amount" integer NOT NULL,
    "credits" integer NOT NULL,
    "status" text NOT NULL DEFAULT 'pending',
    "created_at" integer NOT NULL,
    "completed_at" integer
  )`);
}

export function seedUser(
  db: ReturnType<typeof createTestDb>,
  overrides?: Partial<typeof schema.user.$inferInsert>,
) {
  const id = overrides?.id ?? "test-user-001";
  const now = new Date();
  db.insert(schema.user)
    .values({
      id,
      name: "Test User",
      email: "test@example.com",
      emailVerified: true,
      credits: 100,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    })
    .run();
  return id;
}

export function setMockD1Binding(db: ReturnType<typeof createTestDb>) {
  (globalThis as Record<string, unknown>).__env__ = {
    batchlyai_db: db,
  };
}

export function clearMockD1Binding() {
  delete (globalThis as Record<string, unknown>).__env__;
}
