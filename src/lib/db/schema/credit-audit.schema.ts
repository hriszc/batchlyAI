import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "./auth.schema";

export const creditAuditEvent = sqliteTable(
  "credit_audit_event",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    eventType: text("event_type").notNull(),
    creditType: text("credit_type").notNull(),
    creditsDelta: integer("credits_delta").notNull(),
    freeCreditsUsed: integer("free_credits_used").notNull().default(0),
    paidCreditsUsed: integer("paid_credits_used").notNull().default(0),
    source: text("source").notNull(),
    sourceId: text("source_id"),
    provider: text("provider"),
    model: text("model"),
    apiCallCount: integer("api_call_count").notNull().default(0),
    status: text("status").notNull().default("succeeded"),
    anomalyReason: text("anomaly_reason"),
    metadata: text("metadata"),
    createdAt: integer("created_at")
      .$defaultFn(() => Math.floor(Date.now() / 1000))
      .notNull(),
  },
  (table) => [
    index("credit_audit_event_created_idx").on(table.createdAt),
    index("credit_audit_event_user_idx").on(table.userId),
    index("credit_audit_event_type_idx").on(table.eventType, table.createdAt),
    index("credit_audit_event_ai_idx").on(table.provider, table.model, table.createdAt),
  ],
);
