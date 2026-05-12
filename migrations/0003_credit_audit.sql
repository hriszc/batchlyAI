CREATE TABLE credit_audit_event (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT REFERENCES user(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  credit_type TEXT NOT NULL,
  credits_delta INTEGER NOT NULL,
  free_credits_used INTEGER NOT NULL DEFAULT 0,
  paid_credits_used INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL,
  source_id TEXT,
  provider TEXT,
  model TEXT,
  api_call_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'succeeded',
  anomaly_reason TEXT,
  metadata TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX credit_audit_event_created_idx ON credit_audit_event(created_at);
CREATE INDEX credit_audit_event_user_idx ON credit_audit_event(user_id);
CREATE INDEX credit_audit_event_type_idx ON credit_audit_event(event_type, created_at);
CREATE INDEX credit_audit_event_ai_idx ON credit_audit_event(provider, model, created_at);
