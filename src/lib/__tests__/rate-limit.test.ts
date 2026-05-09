import { afterEach, describe, expect, it, vi } from "vitest";

import { checkRateLimit } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows the first request with remaining = maxRequests - 1", () => {
    const result = checkRateLimit("key-a", 10, 60);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });

  it("allows requests up to the limit", () => {
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit("key-b", 5, 60);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5 - i - 1);
    }
  });

  it("blocks requests beyond the limit", () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit("key-block", 3, 60);
    }
    const result = checkRateLimit("key-block", 3, 60);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("maintains independent limits for different keys", () => {
    // Exhaust key-a
    for (let i = 0; i < 2; i++) {
      checkRateLimit("key-a-ind", 2, 60);
    }
    expect(checkRateLimit("key-a-ind", 2, 60).allowed).toBe(false);
    // key-b should still be allowed
    expect(checkRateLimit("key-b-ind", 2, 60).allowed).toBe(true);
  });

  it("resets after the window expires", () => {
    const fakeNow = Date.now();
    vi.useFakeTimers({ now: fakeNow });

    // Exhaust the limit
    for (let i = 0; i < 2; i++) {
      checkRateLimit("key-reset", 2, 10);
    }
    expect(checkRateLimit("key-reset", 2, 10).allowed).toBe(false);

    // Advance past the window
    vi.advanceTimersByTime(11_000);

    // Should be allowed again with full remaining
    const result = checkRateLimit("key-reset", 2, 10);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it("has correct resetAt timestamp", () => {
    const fakeNow = 1_700_000_000_000;
    vi.useFakeTimers({ now: fakeNow });

    const result = checkRateLimit("key-ts", 5, 30);
    expect(result.resetAt).toBe(fakeNow + 30_000);
  });

  it("evicts expired entries during lazy cleanup", () => {
    const fakeNow = 1_700_000_000_000;
    vi.useFakeTimers({ now: fakeNow });

    checkRateLimit("key-cleanup", 5, 10);
    // Advance past cleanup threshold (30s) + window (10s)
    vi.advanceTimersByTime(41_000);

    // This triggers lazyCleanup which should evict the expired entry
    const result = checkRateLimit("other-key", 5, 60);
    expect(result.allowed).toBe(true);
  });
});

describe("checkRateLimit edge cases", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("handles very large maxRequests", () => {
    const r = checkRateLimit("large-limit", 10000, 60);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(9999);
  });

  it("handles zero window gracefully", () => {
    const r = checkRateLimit("zero-window", 5, 0);
    expect(r.allowed).toBe(true);
  });

  it("different windows have independent expiry", () => {
    const f = Date.now();
    vi.useFakeTimers({ now: f });
    checkRateLimit("short", 2, 1);
    checkRateLimit("long", 2, 100);
    vi.advanceTimersByTime(2000);
    expect(checkRateLimit("short", 2, 1).allowed).toBe(true); // reset
    expect(checkRateLimit("long", 2, 100).allowed).toBe(true); // not yet hit limit
  });

  it("lazyCleanup evicts expired keys after 30s", () => {
    const now = Date.now();
    vi.useFakeTimers({ now });
    // Create an entry that expires in 1s
    checkRateLimit("expire-key", 5, 1);
    // Advance past the 30s cleanup threshold
    vi.advanceTimersByTime(31_000);
    // A new request triggers lazyCleanup which evicts expired entries
    const r = checkRateLimit("other-key", 5, 60);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(4);
  });
});
