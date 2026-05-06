import { relations } from "drizzle-orm";
import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";

import { user } from "./auth.schema";

export const generation = sqliteTable(
  "generation",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    promptTemplate: text("prompt_template").notNull(),
    resolvedPrompts: text("resolved_prompts").notNull(),
    variableGroups: text("variable_groups").notNull(),
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

export const savedPrompt = sqliteTable("saved_prompt", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  promptTemplate: text("prompt_template").notNull(),
  variableGroups: text("variable_groups"),
  model: text("model"),
  tags: text("tags"),
  usageCount: integer("usage_count").default(0),
  createdAt: integer("created_at")
    .$defaultFn(() => Math.floor(Date.now() / 1000))
    .notNull(),
  updatedAt: integer("updated_at")
    .$defaultFn(() => Math.floor(Date.now() / 1000))
    .notNull(),
});

export const work = sqliteTable(
  "work",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    generationId: text("generation_id").references(() => generation.id),
    title: text("title").notNull(),
    description: text("description"),
    category: text("category"),
    promptTemplate: text("prompt_template").notNull(),
    variableGroups: text("variable_groups").notNull(),
    coverUrl: text("cover_url").notNull(),
    resultUrls: text("result_urls").notNull(),
    model: text("model").notNull(),
    parentWorkId: text("parent_work_id"),
    isPublished: integer("is_published").default(0),
    likeCount: integer("like_count").default(0),
    commentCount: integer("comment_count").default(0),
    remixCount: integer("remix_count").default(0),
    createdAt: integer("created_at")
      .$defaultFn(() => Math.floor(Date.now() / 1000))
      .notNull(),
    publishedAt: integer("published_at"),
  },
  (table) => [
    index("work_user_idx").on(table.userId),
    index("work_published_idx").on(table.isPublished, table.createdAt),
    index("work_category_idx").on(table.category),
  ],
);

export const workLike = sqliteTable(
  "work_like",
  {
    id: text("id").primaryKey(),
    workId: text("work_id")
      .notNull()
      .references(() => work.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: integer("created_at")
      .$defaultFn(() => Math.floor(Date.now() / 1000))
      .notNull(),
  },
  (table) => [
    uniqueIndex("work_like_work_user_unique").on(table.workId, table.userId),
  ],
);

export const workComment = sqliteTable("work_comment", {
  id: text("id").primaryKey(),
  workId: text("work_id")
    .notNull()
    .references(() => work.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: integer("created_at")
    .$defaultFn(() => Math.floor(Date.now() / 1000))
    .notNull(),
});

export const generationRelations = relations(generation, ({ one }) => ({
  user: one(user, {
    fields: [generation.userId],
    references: [user.id],
  }),
}));

export const savedPromptRelations = relations(savedPrompt, ({ one }) => ({
  user: one(user, {
    fields: [savedPrompt.userId],
    references: [user.id],
  }),
}));

export const workRelations = relations(work, ({ one, many }) => ({
  user: one(user, {
    fields: [work.userId],
    references: [user.id],
  }),
  generation: one(generation, {
    fields: [work.generationId],
    references: [generation.id],
  }),
  parentWork: one(work, {
    fields: [work.parentWorkId],
    references: [work.id],
    relationName: "parentWork",
  }),
  likes: many(workLike),
  comments: many(workComment),
  remixes: many(work, { relationName: "parentWork" }),
}));

export const workLikeRelations = relations(workLike, ({ one }) => ({
  work: one(work, {
    fields: [workLike.workId],
    references: [work.id],
  }),
  user: one(user, {
    fields: [workLike.userId],
    references: [user.id],
  }),
}));

export const workCommentRelations = relations(workComment, ({ one }) => ({
  work: one(work, {
    fields: [workComment.workId],
    references: [work.id],
  }),
  user: one(user, {
    fields: [workComment.userId],
    references: [user.id],
  }),
}));
