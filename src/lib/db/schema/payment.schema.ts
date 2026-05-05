import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

import { user } from "./auth.schema";

export const creditPurchase = sqliteTable("credit_purchase", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  amount: integer("amount").notNull(),
  credits: integer("credits").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: integer("created_at")
    .$defaultFn(() => Math.floor(Date.now() / 1000))
    .notNull(),
  completedAt: integer("completed_at"),
});
