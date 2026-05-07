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
  getD1Binding: () => ({}) as D1Database,
}));

import { handleGetPrompts, handleSavePrompt } from "@/routes/api/prompts";

function makeGetReq(search?: string): Request {
  const url = new URL("https://batchlyai.com/api/prompts");
  if (search) url.searchParams.set("search", search);
  return { url: url.toString(), headers: new Headers() } as unknown as Request;
}

function makePostReq(body: Record<string, unknown>): Request {
  return {
    json: () => Promise.resolve(body),
    url: "https://batchlyai.com/api/prompts",
    headers: new Headers(),
  } as unknown as Request;
}

describe("handleGetPrompts", () => {
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

  it("returns 401 when not authenticated", async () => {
    mocks.mockGetSession.mockResolvedValue(null);
    const resp = await handleGetPrompts(makeGetReq());
    expect(resp.status).toBe(401);
  });

  it("returns 501 when DB is unavailable", async () => {
    delete (globalThis as Record<string, unknown>).__env__;
    const resp = await handleGetPrompts(makeGetReq());
    expect(resp.status).toBe(501);
  });

  it("returns empty prompts array for new user", async () => {
    seedUser(db, { id: "u1" });
    const resp = await handleGetPrompts(makeGetReq());
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { prompts: unknown[] };
    expect(body.prompts).toEqual([]);
  });
});

describe("handleSavePrompt", () => {
  let db: ReturnType<typeof createTestDb>;
  beforeEach(() => {
    db = createTestDb();
    applyMigrations(db);
    seedUser(db, { id: "u1" });
    vi.clearAllMocks();
    mocks.mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    (globalThis as Record<string, unknown>).__env__ = { batchlyai_db: db };
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as Record<string, unknown>).__env__;
  });

  it("returns 401 when not authenticated", async () => {
    mocks.mockGetSession.mockResolvedValue(null);
    const resp = await handleSavePrompt(makePostReq({ name: "test" }));
    expect(resp.status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    const resp = await handleSavePrompt(makePostReq({}));
    expect(resp.status).toBe(400);
  });
});
