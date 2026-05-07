import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "./auth.schema";

export const generation = sqliteTable(
  "generation",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    promptTemplate: text("prompt_template").notNull(),
    resultUrls: text("result_urls").notNull(),
    model: text("model").notNull(),
    creditsUsed: integer("credits_used").notNull(),
    createdAt: integer("created_at")
      .$defaultFn(() => Math.floor(Date.now() / 1000))
      .notNull(),
  },
  (table) => [
    index("generation_user_idx").on(table.userId),
    index("generation_created_idx").on(table.createdAt),
  ],
);
