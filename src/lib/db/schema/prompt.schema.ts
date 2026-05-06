import { relations } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

import { user } from "./auth.schema";

export const savedPrompt = sqliteTable(
  "saved_prompt",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    promptTemplate: text("prompt_template").notNull(),
    variableGroups: text("variable_groups").notNull().default("[]"),
    model: text("model").notNull().default("z-image-pro"),
    tags: text("tags").notNull().default("[]"),
    usageCount: integer("usage_count").notNull().default(0),
    createdAt: integer("created_at")
      .$defaultFn(() => Math.floor(Date.now() / 1000))
      .notNull(),
  },
  (table) => [
    index("saved_prompt_user_id_idx").on(table.userId),
    index("saved_prompt_name_idx").on(table.name),
  ],
);

export const savedPromptRelations = relations(savedPrompt, ({ one }) => ({
  user: one(user, {
    fields: [savedPrompt.userId],
    references: [user.id],
  }),
}));
