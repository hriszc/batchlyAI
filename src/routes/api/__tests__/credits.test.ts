import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { createTestDb, applyMigrations, seedUser } from "#test/db-setup";

const mocks = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
}));

vi.mock("@/lib/auth/auth", () => ({
  createAuth: () => ({ api: { getSession: mocks.mockGetSession } }),
}));

vi.mock("@/lib/db", () => ({
  getDb: (b: unknown) => b as ReturnType<typeof createTestDb>,
}));

vi.mock("@/lib/cloudflare/bindings", () => ({
  getD1Binding: () => ((globalThis as any).__env__?.batchlyai_db as any) ?? undefined,
}));

import { handleGetCredits } from "@/routes/api/credits";

function makeRequest(): Request {
  return {
    url: "https://batchlyai.com/api/credits",
    headers: new Headers(),
  } as unknown as Request;
}

describe("handleGetCredits", () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    db = createTestDb();
    applyMigrations(db);
    vi.clearAllMocks();
    mocks.mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    (globalThis as Record<string, unknown>).__env__ = { batchlyai_db: db };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as Record<string, unknown>).__env__;
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.mockGetSession.mockResolvedValue(null);

    const resp = await handleGetCredits(makeRequest());

    expect(resp.status).toBe(401);
  });

  it("returns 501 when DB is unavailable", async () => {
    delete (globalThis as Record<string, unknown>).__env__;

    const resp = await handleGetCredits(makeRequest());

    expect(resp.status).toBe(501);
  });

  it("returns the authoritative DB credit balance", async () => {
    seedUser(db, { id: "u1", credits: 123 });

    const resp = await handleGetCredits(makeRequest());
    const body = (await resp.json()) as { credits: number; creditsRemaining: number };

    expect(resp.status).toBe(200);
    expect(body).toEqual({ credits: 123, creditsRemaining: 123 });
  });
});
