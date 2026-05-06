CREATE TABLE `credit_purchase` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`amount` integer NOT NULL,
	`credits` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `referral` (
	`id` text PRIMARY KEY NOT NULL,
	`referrer_id` text NOT NULL,
	`referee_id` text NOT NULL,
	`code` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`referrer_credits_awarded` integer DEFAULT 0 NOT NULL,
	`referee_credits_awarded` integer DEFAULT 0 NOT NULL,
	`purchase_commission_awarded` integer DEFAULT 0 NOT NULL,
	`ip_address` text,
	`created_at` integer NOT NULL,
	`credited_at` integer,
	FOREIGN KEY (`referrer_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`referee_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `referral_referee_id_unique` ON `referral` (`referee_id`);--> statement-breakpoint
CREATE INDEX `referral_referrer_id_idx` ON `referral` (`referrer_id`);--> statement-breakpoint
CREATE INDEX `referral_referee_id_idx` ON `referral` (`referee_id`);--> statement-breakpoint
CREATE TABLE `referral_code` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`code` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `referral_code_user_id_unique` ON `referral_code` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `referral_code_code_unique` ON `referral_code` (`code`);--> statement-breakpoint
CREATE TABLE `shared_batch` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`prompt_template` text NOT NULL,
	`variable_groups` text NOT NULL,
	`result_image_urls` text NOT NULL,
	`model` text NOT NULL,
	`aspect_ratio` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `shared_batch_user_id_idx` ON `shared_batch` (`user_id`);--> statement-breakpoint
CREATE TABLE `template` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`category` text DEFAULT 'general' NOT NULL,
	`prompt_template` text NOT NULL,
	`variable_groups` text NOT NULL,
	`model` text NOT NULL,
	`aspect_ratio` text NOT NULL,
	`preview_image_url` text,
	`is_public` integer DEFAULT true NOT NULL,
	`usage_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `template_slug_unique` ON `template` (`slug`);--> statement-breakpoint
CREATE INDEX `template_category_idx` ON `template` (`category`);--> statement-breakpoint
CREATE INDEX `template_user_id_idx` ON `template` (`user_id`);--> statement-breakpoint
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
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `generation_user_idx` ON `generation` (`user_id`);--> statement-breakpoint
CREATE INDEX `generation_created_idx` ON `generation` (`created_at`);--> statement-breakpoint
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
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
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
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`generation_id`) REFERENCES `generation`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `work_user_idx` ON `work` (`user_id`);--> statement-breakpoint
CREATE INDEX `work_published_idx` ON `work` (`is_published`,`created_at`);--> statement-breakpoint
CREATE INDEX `work_category_idx` ON `work` (`category`);--> statement-breakpoint
CREATE TABLE `work_comment` (
	`id` text PRIMARY KEY NOT NULL,
	`work_id` text NOT NULL,
	`user_id` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`work_id`) REFERENCES `work`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `work_like` (
	`id` text PRIMARY KEY NOT NULL,
	`work_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`work_id`) REFERENCES `work`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `work_like_work_user_unique` ON `work_like` (`work_id`,`user_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`credits` integer DEFAULT 10 NOT NULL,
	`stripe_customer_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_user`("id", "name", "email", "email_verified", "image", "credits", "stripe_customer_id", "created_at", "updated_at") SELECT "id", "name", "email", "email_verified", "image", "credits", "stripe_customer_id", "created_at", "updated_at" FROM `user`;--> statement-breakpoint
DROP TABLE `user`;--> statement-breakpoint
ALTER TABLE `__new_user` RENAME TO `user`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);