CREATE TABLE `work` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `prompt_template` text NOT NULL,
  `result_image_url` text NOT NULL,
  `title` text NOT NULL DEFAULT '',
  `model` text NOT NULL DEFAULT 'z-image-pro',
  `aspect_ratio` text NOT NULL DEFAULT '9:16',
  `category` text NOT NULL DEFAULT 'general',
  `like_count` integer NOT NULL DEFAULT 0,
  `comment_count` integer NOT NULL DEFAULT 0,
  `remix_count` integer NOT NULL DEFAULT 0,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);

CREATE INDEX `work_user_id_idx` ON `work` (`user_id`);
CREATE INDEX `work_category_idx` ON `work` (`category`);
CREATE INDEX `work_created_at_idx` ON `work` (`created_at`);

CREATE TABLE `work_like` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `work_id` text NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`work_id`) REFERENCES `work`(`id`) ON DELETE CASCADE
);

CREATE INDEX `work_like_user_id_idx` ON `work_like` (`user_id`);
CREATE INDEX `work_like_work_id_idx` ON `work_like` (`work_id`);

CREATE TABLE `work_comment` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `work_id` text NOT NULL,
  `content` text NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`work_id`) REFERENCES `work`(`id`) ON DELETE CASCADE
);

CREATE INDEX `work_comment_work_id_idx` ON `work_comment` (`work_id`);
CREATE INDEX `work_comment_user_id_idx` ON `work_comment` (`user_id`);
