CREATE TABLE `credit_audit_event` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text,
  `event_type` text NOT NULL,
  `credit_type` text NOT NULL,
  `credits_delta` integer NOT NULL,
  `free_credits_used` integer DEFAULT 0 NOT NULL,
  `paid_credits_used` integer DEFAULT 0 NOT NULL,
  `source` text NOT NULL,
  `source_id` text,
  `provider` text,
  `model` text,
  `api_call_count` integer DEFAULT 0 NOT NULL,
  `status` text DEFAULT 'succeeded' NOT NULL,
  `anomaly_reason` text,
  `metadata` text,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL
);

CREATE INDEX `credit_audit_event_created_idx` ON `credit_audit_event` (`created_at`);
CREATE INDEX `credit_audit_event_user_idx` ON `credit_audit_event` (`user_id`);
CREATE INDEX `credit_audit_event_type_idx` ON `credit_audit_event` (`event_type`, `created_at`);
CREATE INDEX `credit_audit_event_ai_idx` ON `credit_audit_event` (`provider`, `model`, `created_at`);
