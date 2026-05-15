import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAuth: vi.fn(),
  signInSocial: vi.fn(),
  createSession: vi.fn(),
  getDb: vi.fn(),
  recordCreditGrant: vi.fn(),
}));

vi.mock("@/env/server", () => ({
  env: {
    GOOGLE_CLIENT_ID: "google-client-id",
  },
}));

vi.mock("@/lib/auth/auth", () => ({
  createAuth: mocks.createAuth,
}));

vi.mock("@/lib/db", () => ({
  getDb: mocks.getDb,
}));

vi.mock("@/lib/credits/audit", () => ({
  recordCreditGrant: mocks.recordCreditGrant,
}));

import { handleGoogleOneTap } from "@/routes/api/auth/google-one-tap";

function request(body: unknown, origin = "https://batchlyai.com") {
  return new Request("https://batchlyai.com/api/auth/google-one-tap", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
    },
    body: JSON.stringify(body),
  });
}

function googleToken(overrides: Record<string, unknown> = {}) {
  return {
    email: "user@example.com",
    name: "Google User",
    picture: "https://lh3.googleusercontent.com/avatar.png",
    sub: "google-subject",
    email_verified: "true",
    aud: "google-client-id",
    iss: "accounts.google.com",
    exp: String(Math.floor(Date.now() / 1000) + 3600),
    ...overrides,
  };
}

describe("handleGoogleOneTap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (globalThis as Record<string, unknown>).__env__;
    mocks.signInSocial.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    mocks.createSession.mockResolvedValue(
      new Response(JSON.stringify({ session: true }), { status: 200 }),
    );
    mocks.createAuth.mockReturnValue({
      api: {
        signInSocial: mocks.signInSocial,
        createSession: mocks.createSession,
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(googleToken()), { status: 200 })),
    );
  });

  it("rejects invalid origins before auth", async () => {
    const response = await handleGoogleOneTap(request({ credential: "jwt" }, "https://evil.test"));

    expect(response.status).toBe(403);
    expect(mocks.createAuth).not.toHaveBeenCalled();
  });

  it("returns 501 when auth is unavailable", async () => {
    mocks.createAuth.mockReturnValue(null);

    const response = await handleGoogleOneTap(request({ credential: "jwt" }));

    expect(response.status).toBe(501);
    await expect(response.json()).resolves.toEqual({ error: "Auth not available" });
  });

  it("validates JSON and credential presence", async () => {
    const invalidJsonResponse = await handleGoogleOneTap({
      headers: new Headers({ Origin: "https://batchlyai.com" }),
      json: () => Promise.reject(new Error("bad json")),
    } as unknown as Request);
    const missingCredentialResponse = await handleGoogleOneTap(request({}));

    expect(invalidJsonResponse.status).toBe(400);
    await expect(invalidJsonResponse.json()).resolves.toEqual({ error: "Invalid JSON" });
    expect(missingCredentialResponse.status).toBe(400);
    await expect(missingCredentialResponse.json()).resolves.toEqual({
      error: "Missing credential",
    });
  });

  it.each([
    ["tokeninfo fails", null],
    ["missing email", googleToken({ email: "" })],
    ["wrong audience", googleToken({ aud: "other-client" })],
    ["bad issuer", googleToken({ iss: "evil.example" })],
    ["expired token", googleToken({ exp: String(Math.floor(Date.now() / 1000) - 1) })],
    ["unverified email", googleToken({ email_verified: "false" })],
  ])("rejects invalid Google credential: %s", async (_name, token) => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          token
            ? new Response(JSON.stringify(token), { status: 200 })
            : new Response("invalid", { status: 401 }),
        ),
    );

    const response = await handleGoogleOneTap(request({ credential: "jwt" }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Invalid Google credential" });
  });

  it("returns Better Auth social sign-in response when it succeeds", async () => {
    const response = await handleGoogleOneTap(request({ credential: "jwt" }));

    expect(response.status).toBe(200);
    expect(mocks.signInSocial).toHaveBeenCalledWith({
      body: {
        provider: "google",
        idToken: { token: "jwt" },
      },
      headers: expect.any(Headers),
      asResponse: true,
    });
  });

  it("falls back to manual handling when social sign-in fails", async () => {
    mocks.signInSocial.mockResolvedValue(new Response("unauthorized", { status: 401 }));
    (globalThis as Record<string, unknown>).__env__ = { batchlyai_db: { binding: true } };
    const insert = vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) }));
    const db = {
      query: {
        account: { findFirst: vi.fn().mockResolvedValue({ userId: "existing-user" }) },
        user: { findFirst: vi.fn() },
      },
      insert,
    };
    mocks.getDb.mockReturnValue(db);

    const response = await handleGoogleOneTap(request({ credential: "jwt" }));

    expect(response.status).toBe(200);
    expect(mocks.createSession).toHaveBeenCalledWith({
      body: { userId: "existing-user" },
      headers: expect.any(Headers),
      asResponse: true,
    });
    expect(insert).not.toHaveBeenCalled();
  });

  it("returns 501 when manual fallback has no DB binding", async () => {
    mocks.signInSocial.mockRejectedValue(new Error("provider unavailable"));

    const response = await handleGoogleOneTap(request({ credential: "jwt" }));

    expect(response.status).toBe(501);
    await expect(response.json()).resolves.toEqual({ error: "Database not available" });
  });
});
