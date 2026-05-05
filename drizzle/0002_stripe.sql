-- Stripe integration (applied via wrangler d1 execute on 2026-05-04)
-- This file exists for migration tracking completeness
ALTER TABLE `user` ADD COLUMN `stripe_customer_id` text;
CREATE TABLE `credit_purchase` (
    `id` text PRIMARY KEY NOT NULL,
    `user_id` text NOT NULL REFERENCES `user`(`id`),
    `amount` integer NOT NULL,
    `credits` integer NOT NULL,
    `status` text NOT NULL DEFAULT 'pending',
    `created_at` integer NOT NULL,
    `completed_at` integer
);
