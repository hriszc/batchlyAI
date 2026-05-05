/**
 * In-memory rate limiter -- per Worker isolate, NOT globally consistent.
 *
 * LIMITATION: On Cloudflare Workers, each isolate maintains its own Map.
 * Rate limits may be higher than configured under high traffic (requests
 * spread across isolates). For production use with strict rate limiting:
 *
 *   - Cloudflare WAF Rate Limiting Rules (recommended): Dashboard > Security > WAF
 *   - Durable Objects for global state
 *   - Cloudflare KV with atomic increments for approximate limits
 *
 * For the current deployment scale, this per-isolate limiter provides
 * adequate abuse prevention combined with the credit-based system.
 *
 * Lazy cleanup: expired entries are evicted on each check, and a full sweep
 * runs every 30 seconds to prevent unbounded memory growth.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();
let lastCleanup = Date.now();

function lazyCleanup(now: number) {
  if (now - lastCleanup < 30_000) return;
  lastCleanup = now;
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
}

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  lazyCleanup(now);

  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    const bucket: Bucket = { count: 1, resetAt: now + windowSeconds * 1000 };
    store.set(key, bucket);
    return { allowed: true, remaining: maxRequests - 1, resetAt: bucket.resetAt };
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}
