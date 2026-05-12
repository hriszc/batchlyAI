# Credit Audit Queries

The `credit_audit_event` table stores both credit grants and AI API spending. Use Cloudflare D1 queries to inspect daily usage.

Daily AI API usage:

```sql
SELECT
  date(created_at, 'unixepoch') AS day,
  provider,
  model,
  SUM(api_call_count) AS api_calls,
  SUM(ABS(credits_delta)) AS credits_used,
  SUM(free_credits_used) AS free_credits_used,
  SUM(paid_credits_used) AS paid_credits_used,
  SUM(CASE WHEN anomaly_reason IS NOT NULL THEN 1 ELSE 0 END) AS anomalous_events
FROM credit_audit_event
WHERE event_type = 'spend'
GROUP BY day, provider, model
ORDER BY day DESC, credits_used DESC;
```

Free credit grants:

```sql
SELECT
  date(created_at, 'unixepoch') AS day,
  source,
  COUNT(*) AS grants,
  SUM(credits_delta) AS credits_granted
FROM credit_audit_event
WHERE event_type = 'grant' AND credit_type = 'free'
GROUP BY day, source
ORDER BY day DESC;
```

Suspicious free-credit spend:

```sql
SELECT *
FROM credit_audit_event
WHERE event_type = 'spend'
  AND free_credits_used > 0
  AND anomaly_reason IS NOT NULL
ORDER BY created_at DESC;
```
