CREATE TABLE `work` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `generation_id` text,
  `title` text NOT NULL,
  `description` text DEFAULT '' NOT NULL,
  `category` text DEFAULT 'other' NOT NULL,
  `cover_url` text NOT NULL,
  `result_urls` text NOT NULL,
  `prompt_template` text NOT NULL,
  `variable_groups` text NOT NULL,
  `model` text NOT NULL,
  `like_count` integer DEFAULT 0 NOT NULL,
  `remix_count` integer DEFAULT 0 NOT NULL,
  `is_published` integer DEFAULT false NOT NULL,
  `parent_work_id` text,
  `published_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`parent_work_id`) REFERENCES `work`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `work_user_id_idx` ON `work` (`user_id`);
--> statement-breakpoint
CREATE INDEX `work_category_idx` ON `work` (`category`);
--> statement-breakpoint
CREATE INDEX `work_published_at_idx` ON `work` (`published_at`);
--> statement-breakpoint
CREATE INDEX `work_like_count_idx` ON `work` (`like_count`);
--> statement-breakpoint
CREATE INDEX `work_is_published_idx` ON `work` (`is_published`);
