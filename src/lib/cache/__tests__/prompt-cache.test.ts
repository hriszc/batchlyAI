import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

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
