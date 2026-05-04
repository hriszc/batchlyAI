interface CacheEntry {
  urls: string[];
  createdAt: number;
}

function getKV(): KVNamespace | undefined {
  const platformEnv = (globalThis as Record<string, unknown>).__env__ as
    | Record<string, unknown>
    | undefined;
  return platformEnv?.batchlyai_kv as KVNamespace | undefined;
}

async function hashKey(prompt: string, model: string, aspectRatio: string, n: number): Promise<string> {
  const input = `${prompt}|${model}|${aspectRatio}|${n}`;
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

const TTL_SECONDS = 24 * 60 * 60;

export async function getCachedResult(
  prompt: string,
  model: string,
  aspectRatio: string,
  n: number,
): Promise<string[] | null> {
  const kv = getKV();
  if (!kv) return null;

  try {
    const key = await hashKey(prompt, model, aspectRatio, n);
    const raw = await kv.get(key);
    if (!raw) return null;

    const entry = JSON.parse(raw) as CacheEntry;
    const age = Date.now() - entry.createdAt;
    if (age > TTL_SECONDS * 1000) {
      await kv.delete(key);
      return null;
    }

    return entry.urls.slice(0, n);
  } catch {
    return null;
  }
}

export async function setCachedResult(
  prompt: string,
  model: string,
  aspectRatio: string,
  n: number,
  urls: string[],
): Promise<void> {
  const kv = getKV();
  if (!kv) return;

  try {
    const key = await hashKey(prompt, model, aspectRatio, n);
    const entry: CacheEntry = { urls, createdAt: Date.now() };
    await kv.put(key, JSON.stringify(entry), { expirationTtl: TTL_SECONDS });
  } catch {
    // Cache write failure is non-fatal
  }
}
