CREATE TABLE `generation` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `prompt_template` text NOT NULL,
  `result_urls` text NOT NULL,
  `model` text NOT NULL,
  `credits_used` integer NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
CREATE INDEX `generation_user_idx` ON `generation` (`user_id`);
CREATE INDEX `generation_created_idx` ON `generation` (`created_at`);
