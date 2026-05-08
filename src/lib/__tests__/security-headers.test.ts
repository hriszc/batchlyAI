import { describe, expect, it } from "vitest";

import { applySecurityHeaders } from "@/lib/security-headers";

describe("applySecurityHeaders", () => {
  it("sets all 5 required headers", () => {
    const h = new Headers();
    applySecurityHeaders(h);
    expect(h.get("X-Content-Type-Options")).toBe("nosniff");
    expect(h.get("X-Frame-Options")).toBe("DENY");
    expect(h.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(h.get("Strict-Transport-Security")).toContain("max-age=63072000");
    expect(h.get("Content-Security-Policy")).toContain("default-src");
  });

  it("CSP includes connect-src for AI providers", () => {
    const h = new Headers();
    applySecurityHeaders(h);
    const csp = h.get("Content-Security-Policy") || "";
    expect(csp).toContain("gateway.ai.cloudflare.com");
    expect(csp).toContain("api.deepseek.com");
    expect(csp).toContain("api.replicate.com");
  });
});
