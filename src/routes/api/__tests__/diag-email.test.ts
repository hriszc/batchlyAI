import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockCheckRateLimit: vi.fn(),
  mockFetch: vi.fn(),
}));

vi.mock("@/lib/auth/auth", () => ({
  createAuth: () => ({ api: { getSession: mocks.mockGetSession } }),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mocks.mockCheckRateLimit,
}));

import { handleDiagEmail } from "@/routes/api/diag/email";

function makeRequest(headers = new Headers()): Request {
  return {
    headers,
    url: "https://batchlyai.com/api/diag/email",
  } as unknown as Request;
}

describe("diag email endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockGetSession.mockResolvedValue({ user: { id: "u1", email: "u@test.com" } });
    mocks.mockCheckRateLimit.mockReturnValue({
      allowed: true,
      remaining: 1,
      resetAt: Date.now() + 60_000,
    });
    mocks.mockFetch.mockResolvedValue(new Response("", { status: 200 }));
    vi.stubGlobal("fetch", mocks.mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns 403 for invalid origin before auth or email work", async () => {
    const resp = await handleDiagEmail(
      makeRequest(new Headers({ Origin: "https://evil.example" })),
    );

    expect(resp.status).toBe(403);
    expect(mocks.mockGetSession).not.toHaveBeenCalled();
    expect(mocks.mockFetch).not.toHaveBeenCalled();
  });

  it("rate limits diagnostic email sends per user", async () => {
    mocks.mockCheckRateLimit.mockReturnValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });

    const resp = await handleDiagEmail(makeRequest());

    expect(resp.status).toBe(429);
    expect(mocks.mockCheckRateLimit).toHaveBeenCalledWith("diag:email:u1", 2, 60 * 60);
    expect(mocks.mockFetch).not.toHaveBeenCalled();
  });

  it("sends a diagnostic email for an authenticated user", async () => {
    const resp = await handleDiagEmail(makeRequest());

    expect(resp.status).toBe(200);
    expect(mocks.mockFetch).toHaveBeenCalledWith(
      "https://api.mailchannels.net/tx/v1/send",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
