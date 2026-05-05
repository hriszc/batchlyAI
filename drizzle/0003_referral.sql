ALTER TABLE `user` ADD `referral_tier` text DEFAULT 'none' NOT NULL;
ALTER TABLE `user` ADD `total_referrals` integer DEFAULT 0 NOT NULL;

CREATE TABLE `referral_code` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `code` text NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);

CREATE UNIQUE INDEX `referral_code_user_id_unique` ON `referral_code` (`user_id`);
CREATE UNIQUE INDEX `referral_code_code_unique` ON `referral_code` (`code`);

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
  FOREIGN KEY (`referrer_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`referee_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);

CREATE UNIQUE INDEX `referral_referee_id_unique` ON `referral` (`referee_id`);
CREATE INDEX `referral_referrer_id_idx` ON `referral` (`referrer_id`);
CREATE INDEX `referral_referee_id_idx` ON `referral` (`referee_id`);
