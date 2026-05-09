import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const envMocks = vi.hoisted(() => ({
  GA4_MEASUREMENT_ID: undefined as string | undefined,
  GA4_API_SECRET: undefined as string | undefined,
}));

vi.mock("@/env/server", () => ({
  env: envMocks,
}));

import { trackServer } from "../server";

describe("trackServer", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    envMocks.GA4_MEASUREMENT_ID = undefined;
    envMocks.GA4_API_SECRET = undefined;
  });

  it("sends fetch to Measurement Protocol when configured", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response());
    envMocks.GA4_MEASUREMENT_ID = "G-XXXXXXXXXX";
    envMocks.GA4_API_SECRET = "test-secret";

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
    await trackServer("event", "id");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns silently when GA4_API_SECRET is not set", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    envMocks.GA4_MEASUREMENT_ID = "G-XXXXXXXXXX";
    // GA4_API_SECRET is undefined by default
    await trackServer("event", "id");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns silently when both env vars are missing", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await trackServer("test", "id");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not throw if fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));
    envMocks.GA4_MEASUREMENT_ID = "G-test";
    envMocks.GA4_API_SECRET = "secret";
    await expect(trackServer("test", "id")).resolves.not.toThrow();
  });
});
