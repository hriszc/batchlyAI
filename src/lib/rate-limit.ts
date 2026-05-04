// Simple in-memory rate limiter.
// Per Worker instance (not global), adequate for Free plan abuse prevention.
// Lazy cleanup: expired entries are evicted on each check.

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
