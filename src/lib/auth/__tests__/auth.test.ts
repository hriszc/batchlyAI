import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/env/server", () => ({
  env: {
    VITE_BASE_URL: "http://localhost:3000",
    BETTER_AUTH_SECRET: "test-secret-32-chars-long-enough!",
  },
}));

vi.mock("@/lib/db", () => ({
  getDb: (_binding: unknown) => ({ mockDb: true }),
}));

vi.mock("@/lib/db/schema", () => ({
  default: {},
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

import { createAuth, getAuth } from "@/lib/auth/auth";

describe("createAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).__env__ = { batchlyai_db: { mock: true } };
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as any).__env__;
  });

  it("returns null when DB binding is unavailable", () => {
    delete (globalThis as any).__env__;
    const auth = createAuth();
    expect(auth).toBeNull();
  });

  it("returns auth instance when DB is available", () => {
    const auth = createAuth();
    expect(auth).not.toBeNull();
  });

  it("getAuth returns the same instance after createAuth", () => {
    const auth1 = createAuth();
    const auth2 = getAuth();
    expect(auth2).toBe(auth1);
  });
});
