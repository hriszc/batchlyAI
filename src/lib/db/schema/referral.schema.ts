import { relations } from "drizzle-orm";
import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";

import { user } from "./auth.schema";

export const referralCode = sqliteTable(
  "referral_code",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    createdAt: integer("created_at")
      .$defaultFn(() => Math.floor(Date.now() / 1000))
      .notNull(),
  },
  (table) => [
    uniqueIndex("referral_code_user_id_unique").on(table.userId),
    uniqueIndex("referral_code_code_unique").on(table.code),
  ],
);

export const referral = sqliteTable(
  "referral",
  {
    id: text("id").primaryKey(),
    referrerId: text("referrer_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    refereeId: text("referee_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    status: text("status").default("pending").notNull(),
    referrerCreditsAwarded: integer("referrer_credits_awarded").default(0).notNull(),
    refereeCreditsAwarded: integer("referee_credits_awarded").default(0).notNull(),
    purchaseCommissionAwarded: integer("purchase_commission_awarded").default(0).notNull(),
    ipAddress: text("ip_address"),
    createdAt: integer("created_at")
      .$defaultFn(() => Math.floor(Date.now() / 1000))
      .notNull(),
    creditedAt: integer("credited_at"),
  },
  (table) => [
    uniqueIndex("referral_referee_id_unique").on(table.refereeId),
    index("referral_referrer_id_idx").on(table.referrerId),
    index("referral_referee_id_idx").on(table.refereeId),
  ],
);

export const referralCodeRelations = relations(referralCode, ({ one }) => ({
  user: one(user, {
    fields: [referralCode.userId],
    references: [user.id],
  }),
}));

export const referralRelations = relations(referral, ({ one }) => ({
  referrer: one(user, {
    fields: [referral.referrerId],
    references: [user.id],
    relationName: "referrer",
  }),
  referee: one(user, {
    fields: [referral.refereeId],
    references: [user.id],
    relationName: "referee",
  }),
}));

