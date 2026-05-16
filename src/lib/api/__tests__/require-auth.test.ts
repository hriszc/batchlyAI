import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAuth: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("@/lib/auth/auth", () => ({
  createAuth: mocks.createAuth,
}));

import { requireAuth } from "@/lib/api/require-auth";

describe("requireAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createAuth.mockReturnValue({ api: { getSession: mocks.getSession } });
  });

  it("returns 501 when auth cannot be created", async () => {
    mocks.createAuth.mockReturnValue(null);

    const result = await requireAuth(new Request("https://batchlyai.com/api/private"));

    expect("error" in result).toBe(true);
    expect(result.error?.status).toBe(501);
    await expect(result.error?.json()).resolves.toEqual({ error: "Auth unavailable" });
  });

  it("returns 401 when no authenticated session exists", async () => {
    mocks.getSession.mockResolvedValue(null);

    const result = await requireAuth(new Request("https://batchlyai.com/api/private"));

    expect("error" in result).toBe(true);
    expect(result.error?.status).toBe(401);
    await expect(result.error?.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns user details for an authenticated request", async () => {
    const user = { id: "u1", email: "user@example.com", name: "User" };
    const headers = new Headers({ Cookie: "sid=test" });
    mocks.getSession.mockResolvedValue({ user });

    const result = await requireAuth(new Request("https://batchlyai.com/api/private", { headers }));

    expect("error" in result).toBe(false);
    expect(result.userId).toBe("u1");
    expect(result.user).toBe(user);
    expect(mocks.getSession).toHaveBeenCalledWith({ headers });
  });
});
