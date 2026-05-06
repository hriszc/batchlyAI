import { relations } from "drizzle-orm";
import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

import { user } from "./auth.schema";

export const sharedBatch = sqliteTable(
  "shared_batch",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    promptTemplate: text("prompt_template").notNull(),
    variableGroups: text("variable_groups").notNull(),
    resultImageUrls: text("result_image_urls").notNull(),
    model: text("model").notNull(),
    aspectRatio: text("aspect_ratio").notNull(),
    createdAt: integer("created_at")
      .$defaultFn(() => Math.floor(Date.now() / 1000))
      .notNull(),
  },
  (table) => [index("shared_batch_user_id_idx").on(table.userId)],
);

export const template = sqliteTable(
  "template",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    category: text("category").notNull().default("general"),
    promptTemplate: text("prompt_template").notNull(),
    variableGroups: text("variable_groups").notNull(),
    model: text("model").notNull(),
    aspectRatio: text("aspect_ratio").notNull(),
    previewImageUrl: text("preview_image_url"),
    isPublic: integer("is_public", { mode: "boolean" }).notNull().default(true),
    usageCount: integer("usage_count").notNull().default(0),
    createdAt: integer("created_at")
      .$defaultFn(() => Math.floor(Date.now() / 1000))
      .notNull(),
  },
  (table) => [
    uniqueIndex("template_slug_unique").on(table.slug),
    index("template_category_idx").on(table.category),
    index("template_user_id_idx").on(table.userId),
  ],
);

export const sharedBatchRelations = relations(sharedBatch, ({ one }) => ({
  user: one(user, {
    fields: [sharedBatch.userId],
    references: [user.id],
  }),
}));

export const templateRelations = relations(template, ({ one }) => ({
  user: one(user, {
    fields: [template.userId],
    references: [user.id],
  }),
}));
