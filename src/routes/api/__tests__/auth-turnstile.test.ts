import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mockSignUpEmail: vi.fn(),
  mockVerifyTurnstileToken: vi.fn(),
}));

vi.mock("@/env/server", () => ({
  env: {
    VITE_BASE_URL: "https://batchlyai.com",
    BETTER_AUTH_SECRET: "test-secret-32-chars-long-enough!",
  },
}));

vi.mock("@/lib/auth/auth", () => ({
  createAuth: () => ({
    api: {
      signUpEmail: mocks.mockSignUpEmail,
    },
    handler: vi.fn(),
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: () => ({ allowed: true, remaining: 9, resetAt: Date.now() + 60_000 }),
}));

vi.mock("@/lib/turnstile", () => ({
  verifyTurnstileToken: mocks.mockVerifyTurnstileToken,
}));

vi.mock("@/lib/cloudflare/bindings", () => ({
  getD1Binding: () => null,
}));

vi.mock("@/lib/analytics/server", () => ({
  trackServer: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/referral/process", () => ({
  processReferralAfterSignup: vi.fn(),
}));

import { handleAuthPost } from "@/routes/api/auth/$";

function makeSignupRequest(body: Record<string, unknown>): Request {
  return {
    clone: () => makeSignupRequest(body),
    headers: new Headers({ Origin: "https://batchlyai.com", "CF-Connecting-IP": "203.0.113.10" }),
    json: () => Promise.resolve(body),
    url: "https://batchlyai.com/api/auth/sign-up/email",
  } as unknown as Request;
}

describe("auth signup Turnstile protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockVerifyTurnstileToken.mockResolvedValue({ ok: true });
    mocks.mockSignUpEmail.mockResolvedValue(
      new Response(
        JSON.stringify({ token: "token", user: { id: "u1", email: "u@test.com", name: "U" } }),
        { status: 200 },
      ),
    );
  });

  it("rejects signup before creating an account when Turnstile fails", async () => {
    mocks.mockVerifyTurnstileToken.mockResolvedValue({
      ok: false,
      status: 403,
      message: "Human verification failed",
    });

    const resp = await handleAuthPost(makeSignupRequest({ email: "u@test.com" }));

    expect(resp.status).toBe(403);
    expect(mocks.mockSignUpEmail).not.toHaveBeenCalled();
  });

  it("passes the Turnstile token to verifier before signup", async () => {
    const resp = await handleAuthPost(
      makeSignupRequest({
        email: "u@test.com",
        password: "password123",
        name: "U",
        "cf-turnstile-response": "token-123",
      }),
    );

    expect(resp.status).toBe(200);
    expect(mocks.mockVerifyTurnstileToken).toHaveBeenCalledWith(
      "token-123",
      expect.objectContaining({ url: "https://batchlyai.com/api/auth/sign-up/email" }),
    );
    expect(mocks.mockSignUpEmail).toHaveBeenCalled();
  });
});
