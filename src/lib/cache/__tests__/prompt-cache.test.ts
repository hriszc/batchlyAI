import { describe, expect, it, afterEach, vi } from "vitest";

import {
  getCachedResult,
  setCachedResult,
  getExpandCache,
  setExpandCache,
} from "@/lib/cache/prompt-cache";

describe("getCachedResult", () => {
  afterEach(() => {
    delete (globalThis as any).__env__;
    vi.restoreAllMocks();
  });

  it("returns null when KV is not available", async () => {
    const result = await getCachedResult("prompt", "model", "1:1", 1);
    expect(result).toBeNull();
  });

  it("returns null when KV has no entry", async () => {
    (globalThis as any).__env__ = { batchlyai_kv: { get: vi.fn().mockResolvedValue(null) } };
    const result = await getCachedResult("prompt", "model", "1:1", 1);
    expect(result).toBeNull();
  });

  it("returns URLs on cache hit", async () => {
    const entry = { urls: ["https://a.png", "https://b.png"], createdAt: Date.now() };
    (globalThis as any).__env__ = {
      batchlyai_kv: { get: vi.fn().mockResolvedValue(JSON.stringify(entry)) },
    };
    const result = await getCachedResult("prompt", "model", "1:1", 2);
    expect(result).toEqual(["https://a.png", "https://b.png"]);
  });

  it("includes video duration in the cache key", async () => {
    const get = vi.fn().mockResolvedValue(null);
    (globalThis as any).__env__ = { batchlyai_kv: { get } };

    await getCachedResult("prompt", "z-video-fast", "1:1", 1, 5);
    await getCachedResult("prompt", "z-video-fast", "1:1", 1, 10);

    expect(get.mock.calls[0]?.[0]).not.toBe(get.mock.calls[1]?.[0]);
  });

  it("includes attached urls in the cache key", async () => {
    const get = vi.fn().mockResolvedValue(null);
    (globalThis as any).__env__ = { batchlyai_kv: { get } };

    await getCachedResult("prompt", "z-image-fast", "1:1", 1, undefined, [
      "https://a.example.com/1.png",
    ]);
    await getCachedResult("prompt", "z-image-fast", "1:1", 1, undefined, [
      "https://b.example.com/2.png",
    ]);

    expect(get.mock.calls[0]?.[0]).not.toBe(get.mock.calls[1]?.[0]);
  });

  it("respects n parameter to limit results", async () => {
    const entry = { urls: ["u1", "u2", "u3", "u4"], createdAt: Date.now() };
    (globalThis as any).__env__ = {
      batchlyai_kv: { get: vi.fn().mockResolvedValue(JSON.stringify(entry)) },
    };
    const result = await getCachedResult("p", "m", "1:1", 2);
    expect(result).toEqual(["u1", "u2"]);
  });
});

describe("setCachedResult", () => {
  afterEach(() => {
    delete (globalThis as any).__env__;
  });
  it("does not throw when KV is unavailable", async () => {
    await expect(setCachedResult("p", "m", "1:1", 1, ["url"])).resolves.toBeUndefined();
  });
  it("writes to KV when available", async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    (globalThis as any).__env__ = { batchlyai_kv: { put } };
    await setCachedResult("p", "m", "1:1", 1, ["url"]);
    expect(put).toHaveBeenCalled();
  });
});

describe("expand cache", () => {
  afterEach(() => {
    delete (globalThis as any).__env__;
  });
  it("getExpandCache returns null when KV unavailable", async () => {
    expect(await getExpandCache("test")).toBeNull();
  });
  it("setExpandCache does not throw when KV unavailable", async () => {
    await expect(setExpandCache("test", ["a", "b"])).resolves.toBeUndefined();
  });
});

// --- TTL expiry ---
describe("cache expiry", () => {
  afterEach(() => {
    delete (globalThis as any).__env__;
    vi.restoreAllMocks();
  });

  it("returns null when cache entry is expired", async () => {
    // Create an entry that's 25 hours old (TTL is 24h)
    const oldEntry = { urls: ["https://old.png"], createdAt: Date.now() - 25 * 60 * 60 * 1000 };
    const mockKv = {
      get: vi.fn().mockResolvedValue(JSON.stringify(oldEntry)),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    (globalThis as any).__env__ = { batchlyai_kv: mockKv };

    const result = await getCachedResult("p", "m", "1:1", 1);
    expect(result).toBeNull();
    // Expired entry should be deleted
    expect(mockKv.delete).toHaveBeenCalled();
  });

  it("returns cached result when entry is fresh", async () => {
    const freshEntry = { urls: ["https://fresh.png"], createdAt: Date.now() - 1000 };
    const mockKv = { get: vi.fn().mockResolvedValue(JSON.stringify(freshEntry)) };
    (globalThis as any).__env__ = { batchlyai_kv: mockKv };

    const result = await getCachedResult("p", "m", "1:1", 1);
    expect(result).toEqual(["https://fresh.png"]);
  });

  it("handles JSON parse error gracefully", async () => {
    const mockKv = { get: vi.fn().mockResolvedValue("{invalid json") };
    (globalThis as any).__env__ = { batchlyai_kv: mockKv };

    const result = await getCachedResult("p", "m", "1:1", 1);
    expect(result).toBeNull();
  });

  it("handles KV read error gracefully", async () => {
    const mockKv = { get: vi.fn().mockRejectedValue(new Error("KV error")) };
    (globalThis as any).__env__ = { batchlyai_kv: mockKv };

    const result = await getCachedResult("p", "m", "1:1", 1);
    expect(result).toBeNull();
  });
});
