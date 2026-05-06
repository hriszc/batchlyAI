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
    promptTemplate: text("prompt_template").notNull(),
    resultImageUrl: text("result_image_url").notNull(),
    title: text("title").notNull().default(""),
    model: text("model").notNull().default("z-image-pro"),
    aspectRatio: text("aspect_ratio").notNull().default("9:16"),
    category: text("category").notNull().default("general"),
    likeCount: integer("like_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    remixCount: integer("remix_count").notNull().default(0),
    createdAt: integer("created_at")
      .$defaultFn(() => Math.floor(Date.now() / 1000))
      .notNull(),
  },
  (table) => [
    index("work_user_id_idx").on(table.userId),
    index("work_category_idx").on(table.category),
    index("work_created_at_idx").on(table.createdAt),
  ],
);

export const workLike = sqliteTable(
  "work_like",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    workId: text("work_id")
      .notNull()
      .references(() => work.id, { onDelete: "cascade" }),
    createdAt: integer("created_at")
      .$defaultFn(() => Math.floor(Date.now() / 1000))
      .notNull(),
  },
  (table) => [
    index("work_like_user_id_idx").on(table.userId),
    index("work_like_work_id_idx").on(table.workId),
  ],
);

export const workComment = sqliteTable(
  "work_comment",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    workId: text("work_id")
      .notNull()
      .references(() => work.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: integer("created_at")
      .$defaultFn(() => Math.floor(Date.now() / 1000))
      .notNull(),
  },
  (table) => [
    index("work_comment_work_id_idx").on(table.workId),
    index("work_comment_user_id_idx").on(table.userId),
  ],
);

export const workRelations = relations(work, ({ one, many }) => ({
  user: one(user, {
    fields: [work.userId],
    references: [user.id],
  }),
  likes: many(workLike),
  comments: many(workComment),
}));

export const workLikeRelations = relations(workLike, ({ one }) => ({
  user: one(user, {
    fields: [workLike.userId],
    references: [user.id],
  }),
  work: one(work, {
    fields: [workLike.workId],
    references: [work.id],
  }),
}));

export const workCommentRelations = relations(workComment, ({ one }) => ({
  user: one(user, {
    fields: [workComment.userId],
    references: [user.id],
  }),
  work: one(work, {
    fields: [workComment.workId],
    references: [work.id],
  }),
}));
