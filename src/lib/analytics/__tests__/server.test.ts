import { describe, it, expect, vi, beforeEach } from "vitest";

import { trackServer } from "../server";

describe("trackServer", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as Record<string, unknown>).__env__;
  });

  function setEnv(id?: string, secret?: string) {
    (globalThis as Record<string, unknown>).__env__ = {
      GA4_MEASUREMENT_ID: id,
      GA4_API_SECRET: secret,
    };
  }

  it("sends fetch to Measurement Protocol when configured", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response());
    setEnv("G-XXXXXXXXXX", "test-secret");

    await trackServer("test_event", "client-123", { key: "value" });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toContain("google-analytics.com/mp/collect");
    expect(url).toContain("measurement_id=G-XXXXXXXXXX");
    expect(url).toContain("api_secret=test-secret");

    const body = JSON.parse(init!.body as string);
    expect(body.client_id).toBe("client-123");
    expect(body.events).toEqual([{ name: "test_event", params: { key: "value" } }]);
  });

  it("returns silently when GA4_MEASUREMENT_ID is not set", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    setEnv(undefined, "secret");
    await trackServer("event", "id");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns silently when GA4_API_SECRET is not set", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    setEnv("G-XXXXXXXXXX", undefined);
    await trackServer("event", "id");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns silently when __env__ is not available", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    // __env__ is already deleted in beforeEach
    await trackServer("test", "id");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not throw if fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));
    setEnv("G-test", "secret");
    await expect(trackServer("test", "id")).resolves.not.toThrow();
  });
});
