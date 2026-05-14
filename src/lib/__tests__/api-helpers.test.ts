import { describe, expect, it } from "vitest";

import { jsonResponse, verifyOrigin } from "@/lib/api-helpers";
import { applySecurityHeaders } from "@/lib/security-headers";

describe("jsonResponse", () => {
  it("returns Response with JSON content type", () => {
    const r = jsonResponse({ ok: true }, 200);
    expect(r.status).toBe(200);
    expect(r.headers.get("Content-Type")).toBe("application/json");
  });

  it("sets status code correctly", () => {
    expect(jsonResponse({}, 404).status).toBe(404);
    expect(jsonResponse({}, 500).status).toBe(500);
  });

  it("includes security headers", () => {
    const r = jsonResponse({}, 200);
    expect(r.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(r.headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("includes extra headers when provided", () => {
    const r = jsonResponse({}, 200, { "X-Custom": "value" });
    expect(r.headers.get("X-Custom")).toBe("value");
  });

  it("serializes data as JSON", async () => {
    const r = jsonResponse({ hello: "world" }, 200);
    const body = await r.json();
    expect(body).toEqual({ hello: "world" });
  });
});

describe("verifyOrigin", () => {
  it("accepts the apex production domain", () => {
    const request = new Request("https://batchlyai.com/api/auth/sign-in/email", {
      method: "POST",
      headers: { Origin: "https://batchlyai.com" },
    });

    expect(verifyOrigin(request)).toBe(true);
  });

  it("accepts the www production domain", () => {
    const request = new Request("https://www.batchlyai.com/api/auth/sign-in/email", {
      method: "POST",
      headers: { Origin: "https://www.batchlyai.com" },
    });

    expect(verifyOrigin(request)).toBe(true);
  });

  it("rejects unknown origins", () => {
    const request = new Request("https://batchlyai.com/api/auth/sign-in/email", {
      method: "POST",
      headers: { Origin: "https://example.com" },
    });

    expect(verifyOrigin(request)).toBe(false);
  });
});

describe("applySecurityHeaders", () => {
  it("sets all required security headers", () => {
    const h = new Headers();
    applySecurityHeaders(h);
    expect(h.get("X-Content-Type-Options")).toBe("nosniff");
    expect(h.get("X-Frame-Options")).toBe("DENY");
    expect(h.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(h.get("Strict-Transport-Security")).toContain("max-age=63072000");
    expect(h.get("Content-Security-Policy")).toContain("default-src");
  });
});
