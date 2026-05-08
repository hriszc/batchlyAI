import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { track, trackPageView } from "@/lib/analytics/client";

describe("track", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls window.gtag with event and props", () => {
    const gtag = vi.fn();
    (globalThis as any).window = { gtag };
    track("generate", { model: "z-image-pro" });
    expect(gtag).toHaveBeenCalledWith("event", "generate", { model: "z-image-pro" });
  });

  it("does nothing when window.gtag is undefined", () => {
    (globalThis as any).window = {};
    expect(() => track("event")).not.toThrow();
  });

  it("does nothing when window is undefined (SSR)", () => {
    const saved = (globalThis as any).window;
    delete (globalThis as any).window;
    expect(() => track("event")).not.toThrow();
    (globalThis as any).window = saved;
  });
});

describe("trackPageView", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls gtag config with page path and title", () => {
    const gtag = vi.fn();
    (globalThis as any).window = { gtag, location: { href: "https://batchlyai.com/test" } };
    (globalThis as any).document = { title: "Test Page" };
    trackPageView("/test", "Test Page");
    expect(gtag).toHaveBeenCalled();
    const args = gtag.mock.calls[0];
    expect(args[0]).toBe("config");
    expect(args[2].page_path).toBe("/test");
  });
});
