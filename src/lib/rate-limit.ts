// KV-backed rate limiter using Cloudflare KV (batchlyai_kv binding).
// KV has eventual consistency, so there's a brief window (~1s) where counters
// may lag across Worker instances. This is acceptable for abuse prevention.

interface KvNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

function getKv(): KvNamespace | undefined {
  const platformEnv = (globalThis as Record<string, unknown>).__env__ as
    | Record<string, unknown>
    | undefined;
  return platformEnv?.batchlyai_kv as KvNamespace | undefined;
}

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const kv = getKv();
  if (!kv) {
    return { allowed: true, remaining: maxRequests, resetAt: Date.now() + windowSeconds * 1000 };
  }

  const now = Date.now();
  const resetAt = now + windowSeconds * 1000;

  try {
    const current = await kv.get(key);
    if (!current) {
      await kv.put(key, "1", { expirationTtl: windowSeconds });
      return { allowed: true, remaining: maxRequests - 1, resetAt };
    }

    const count = parseInt(current, 10);
    if (isNaN(count) || count >= maxRequests) {
      return { allowed: false, remaining: 0, resetAt };
    }

    await kv.put(key, String(count + 1), { expirationTtl: windowSeconds });
    return { allowed: true, remaining: maxRequests - (count + 1), resetAt };
  } catch (err) {
    console.error("[rate-limit] KV error:", err);
    return { allowed: true, remaining: maxRequests, resetAt };
  }
}
