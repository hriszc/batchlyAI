CREATE TABLE `generation` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `prompt_template` text NOT NULL,
  `resolved_prompts` text NOT NULL,
  `variable_groups` text NOT NULL,
  `result_urls` text NOT NULL,
  `model` text NOT NULL,
  `credits_used` integer NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);

CREATE INDEX `generation_user_idx` ON `generation` (`user_id`);
CREATE INDEX `generation_created_idx` ON `generation` (`created_at`);

CREATE TABLE `saved_prompt` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `name` text NOT NULL,
  `prompt_template` text NOT NULL,
  `variable_groups` text,
  `model` text,
  `tags` text,
  `usage_count` integer DEFAULT 0,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);

CREATE INDEX `saved_prompt_user_idx` ON `saved_prompt` (`user_id`);

CREATE TABLE `work` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `generation_id` text,
  `title` text NOT NULL,
  `description` text,
  `category` text,
  `prompt_template` text NOT NULL,
  `variable_groups` text NOT NULL,
  `cover_url` text NOT NULL,
  `result_urls` text NOT NULL,
  `model` text NOT NULL,
  `parent_work_id` text,
  `is_published` integer DEFAULT 0,
  `like_count` integer DEFAULT 0,
  `comment_count` integer DEFAULT 0,
  `remix_count` integer DEFAULT 0,
  `created_at` integer NOT NULL,
  `published_at` integer,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`generation_id`) REFERENCES `generation`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`parent_work_id`) REFERENCES `work`(`id`) ON DELETE SET NULL
);

CREATE INDEX `work_user_idx` ON `work` (`user_id`);
CREATE INDEX `work_published_idx` ON `work` (`is_published`, `created_at`);
CREATE INDEX `work_category_idx` ON `work` (`category`);

CREATE TABLE `work_like` (
  `id` text PRIMARY KEY NOT NULL,
  `work_id` text NOT NULL,
  `user_id` text NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`work_id`) REFERENCES `work`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);

CREATE UNIQUE INDEX `work_like_unique` ON `work_like` (`work_id`, `user_id`);

CREATE TABLE `work_comment` (
  `id` text PRIMARY KEY NOT NULL,
  `work_id` text NOT NULL,
  `user_id` text NOT NULL,
  `content` text NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`work_id`) REFERENCES `work`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
