import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mockCheckRateLimit: vi.fn(),
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
  checkRateLimit: mocks.mockCheckRateLimit,
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

import { SIGNUP_PROOF_DIFFICULTY, type SignupProof } from "@/lib/signup-proof";
import { handleAuthPost } from "@/routes/api/auth/$";

function makeSignupRequest(body: Record<string, unknown>): Request {
  return {
    clone: () => makeSignupRequest(body),
    headers: new Headers({ Origin: "https://batchlyai.com", "CF-Connecting-IP": "203.0.113.10" }),
    json: () => Promise.resolve(body),
    url: "https://batchlyai.com/api/auth/sign-up/email",
  } as unknown as Request;
}

function makeSignupProof(overrides?: Partial<SignupProof>): SignupProof {
  return {
    difficulty: SIGNUP_PROOF_DIFFICULTY,
    email: "u@test.com",
    hash: "0000031d584a2699068f898e72d2a4e60035c9ee6a4c08825c2af15e9f0faed9",
    nonce: "0000000000014f70",
    timestamp: 1_700_000_000_000,
    ...overrides,
  };
}

describe("auth signup Turnstile protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_000_000);
    mocks.mockCheckRateLimit.mockReturnValue({
      allowed: true,
      remaining: 9,
      resetAt: Date.now() + 60_000,
    });
    mocks.mockVerifyTurnstileToken.mockResolvedValue({ ok: true });
    mocks.mockSignUpEmail.mockResolvedValue(
      new Response(
        JSON.stringify({ token: "token", user: { id: "u1", email: "u@test.com", name: "U" } }),
        { status: 200 },
      ),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects signup before creating an account when Turnstile token is missing", async () => {
    mocks.mockVerifyTurnstileToken.mockResolvedValue({
      ok: false,
      status: 403,
      message: "Human verification required",
    });

    const resp = await handleAuthPost(makeSignupRequest({ email: "u@test.com" }));

    expect(resp.status).toBe(403);
    expect(mocks.mockVerifyTurnstileToken).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ url: "https://batchlyai.com/api/auth/sign-up/email" }),
    );
    expect(mocks.mockSignUpEmail).not.toHaveBeenCalled();
  });

  it("rejects signup before creating an account when Turnstile fails", async () => {
    mocks.mockVerifyTurnstileToken.mockResolvedValue({
      ok: false,
      status: 403,
      message: "Human verification failed",
    });

    const resp = await handleAuthPost(
      makeSignupRequest({
        email: "u@test.com",
        password: "password123",
        name: "U",
        "cf-turnstile-response": "bad-token",
      }),
    );

    expect(resp.status).toBe(403);
    expect(mocks.mockVerifyTurnstileToken).toHaveBeenCalled();
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

  it("allows signup with a valid fallback proof when Turnstile fails", async () => {
    mocks.mockVerifyTurnstileToken.mockResolvedValue({
      ok: false,
      status: 403,
      message: "Human verification failed",
    });

    const signupProof = makeSignupProof();
    const resp = await handleAuthPost(
      makeSignupRequest({
        email: "U@Test.com",
        password: "password123",
        name: "U",
        signupProof,
      }),
    );

    expect(resp.status).toBe(200);
    expect(mocks.mockCheckRateLimit).toHaveBeenCalledWith("sign-up/email:pow:203.0.113.10", 3, 300);
    expect(mocks.mockSignUpEmail).toHaveBeenCalled();
  });

  it("rejects fallback proof when the email does not match", async () => {
    mocks.mockVerifyTurnstileToken.mockResolvedValue({
      ok: false,
      status: 403,
      message: "Human verification failed",
    });

    const signupProof = makeSignupProof({ email: "other@test.com" });
    const resp = await handleAuthPost(
      makeSignupRequest({
        email: "u@test.com",
        password: "password123",
        name: "U",
        signupProof,
      }),
    );

    expect(resp.status).toBe(403);
    expect(mocks.mockSignUpEmail).not.toHaveBeenCalled();
  });

  it("does not use fallback proof when Turnstile is unavailable server-side", async () => {
    mocks.mockVerifyTurnstileToken.mockResolvedValue({
      ok: false,
      status: 503,
      message: "Human verification unavailable",
    });

    const resp = await handleAuthPost(
      makeSignupRequest({
        email: "u@test.com",
        password: "password123",
        name: "U",
        signupProof: makeSignupProof(),
      }),
    );

    expect(resp.status).toBe(503);
    expect(mocks.mockSignUpEmail).not.toHaveBeenCalled();
  });

  it("rejects fallback proof when it is expired", async () => {
    mocks.mockVerifyTurnstileToken.mockResolvedValue({
      ok: false,
      status: 403,
      message: "Human verification failed",
    });

    const signupProof = makeSignupProof({ timestamp: Date.now() - 11 * 60 * 1000 });
    const resp = await handleAuthPost(
      makeSignupRequest({
        email: "u@test.com",
        password: "password123",
        name: "U",
        signupProof,
      }),
    );

    expect(resp.status).toBe(403);
    expect(mocks.mockSignUpEmail).not.toHaveBeenCalled();
  });

  it("applies a stricter rate limit to fallback proof signups", async () => {
    mocks.mockVerifyTurnstileToken.mockResolvedValue({
      ok: false,
      status: 403,
      message: "Human verification failed",
    });
    mocks.mockCheckRateLimit.mockImplementation((key: string) => ({
      allowed: key !== "sign-up/email:pow:203.0.113.10",
      remaining: 0,
      resetAt: Date.now() + 60_000,
    }));

    const signupProof = makeSignupProof();
    const resp = await handleAuthPost(
      makeSignupRequest({
        email: "u@test.com",
        password: "password123",
        name: "U",
        signupProof,
      }),
    );

    expect(resp.status).toBe(429);
    expect(mocks.mockSignUpEmail).not.toHaveBeenCalled();
  });
});
