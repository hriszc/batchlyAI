import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFetch = vi.fn();

vi.mock("@/env/server", () => ({
  env: {
    VITE_BASE_URL: "https://batchlyai.com",
    TURNSTILE_SECRET_KEY: "turnstile-secret",
  },
}));

import { shouldEnforceTurnstile, verifyTurnstileToken } from "@/lib/turnstile";

function makeRequest(): Request {
  return {
    headers: new Headers({ "CF-Connecting-IP": "203.0.113.10" }),
  } as unknown as Request;
}

describe("turnstile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
  });

  it("enforces Turnstile for production base URL when secret is configured", () => {
    expect(shouldEnforceTurnstile()).toBe(true);
  });

  it("rejects missing token before calling siteverify", async () => {
    const result = await verifyTurnstileToken(undefined, makeRequest());

    expect(result).toEqual({
      ok: false,
      status: 403,
      message: "Human verification required",
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("accepts a successful siteverify response", async () => {
    const result = await verifyTurnstileToken("token-123", makeRequest());

    expect(result).toEqual({ ok: true });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
    const body = JSON.parse((mockFetch.mock.calls[0][1] as { body: string }).body) as Record<
      string,
      string
    >;
    expect(body.secret).toBe("turnstile-secret");
    expect(body.response).toBe("token-123");
    expect(body.remoteip).toBe("203.0.113.10");
  });

  it("rejects failed siteverify responses", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ success: false, "error-codes": ["invalid-input-response"] }), {
        status: 200,
      }),
    );

    const result = await verifyTurnstileToken("bad-token", makeRequest());

    expect(result).toEqual({
      ok: false,
      status: 403,
      message: "Human verification failed",
    });
  });
});
