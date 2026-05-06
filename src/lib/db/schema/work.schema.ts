import { relations } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

import { user } from "./auth.schema";

export const work = sqliteTable(
  "work",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    generationId: text("generation_id"),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    category: text("category").notNull().default("other"),
    coverUrl: text("cover_url").notNull(),
    resultUrls: text("result_urls").notNull(),
    promptTemplate: text("prompt_template").notNull(),
    variableGroups: text("variable_groups").notNull(),
    model: text("model").notNull(),
    likeCount: integer("like_count").notNull().default(0),
    remixCount: integer("remix_count").notNull().default(0),
    isPublished: integer("is_published", { mode: "boolean" }).notNull().default(false),
    parentWorkId: text("parent_work_id"),
    publishedAt: integer("published_at", { mode: "timestamp" }),
    createdAt: integer("created_at")
      .$defaultFn(() => Math.floor(Date.now() / 1000))
      .notNull(),
    updatedAt: integer("updated_at")
      .$defaultFn(() => Math.floor(Date.now() / 1000))
      .$onUpdate(() => Math.floor(Date.now() / 1000))
      .notNull(),
  },
  (table) => [
    index("work_user_id_idx").on(table.userId),
    index("work_category_idx").on(table.category),
    index("work_published_at_idx").on(table.publishedAt),
    index("work_like_count_idx").on(table.likeCount),
    index("work_is_published_idx").on(table.isPublished),
  ],
);

export const workRelations = relations(work, ({ one }) => ({
  user: one(user, {
    fields: [work.userId],
    references: [user.id],
  }),
  parentWork: one(work, {
    fields: [work.parentWorkId],
    references: [work.id],
    relationName: "parentWorkRelation",
  }),
}));
