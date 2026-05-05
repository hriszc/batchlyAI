CREATE TABLE `shared_batch` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `prompt_template` text NOT NULL,
  `variable_groups` text NOT NULL,
  `result_image_urls` text NOT NULL,
  `model` text NOT NULL,
  `aspect_ratio` text NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);

CREATE INDEX `shared_batch_user_id_idx` ON `shared_batch` (`user_id`);

CREATE TABLE `template` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `slug` text NOT NULL,
  `name` text NOT NULL,
  `description` text NOT NULL DEFAULT '',
  `category` text NOT NULL DEFAULT 'general',
  `prompt_template` text NOT NULL,
  `variable_groups` text NOT NULL,
  `model` text NOT NULL,
  `aspect_ratio` text NOT NULL,
  `preview_image_url` text,
  `is_public` integer NOT NULL DEFAULT 1,
  `usage_count` integer NOT NULL DEFAULT 0,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);

CREATE UNIQUE INDEX `template_slug_unique` ON `template` (`slug`);
CREATE INDEX `template_category_idx` ON `template` (`category`);
CREATE INDEX `template_user_id_idx` ON `template` (`user_id`);
