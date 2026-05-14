import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { createTestDb, applyMigrations, seedUser } from "#test/db-setup";
import { savedPrompt } from "@/lib/db/schema/data-flywheel.schema";

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

import { handleGetPrompts, handleSavePrompt, handleDeletePrompt } from "@/routes/api/prompts";

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

  it("hides duplicate prompt templates from existing data", async () => {
    seedUser(db, { id: "u1" });
    const now = Math.floor(Date.now() / 1000);
    db.insert(savedPrompt)
      .values([
        {
          id: "old",
          userId: "u1",
          name: "Old",
          promptTemplate: "A {{cat, dog}} in a forest",
          createdAt: now - 10,
          updatedAt: now - 10,
        },
        {
          id: "new",
          userId: "u1",
          name: "New",
          promptTemplate: "A {{cat, dog}} in a forest",
          createdAt: now,
          updatedAt: now,
        },
      ])
      .run();

    const resp = await handleGetPrompts(makeGetReq());
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { prompts: Array<{ id: string }> };
    expect(body.prompts.map((prompt) => prompt.id)).toEqual(["new"]);
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

  it("updates an existing prompt instead of inserting a duplicate", async () => {
    const firstResp = await handleSavePrompt(
      makePostReq({
        name: "First",
        promptTemplate: "  A {{cat, dog}} in a forest  ",
        model: "z-image-fast",
      }),
    );
    expect(firstResp.status).toBe(201);

    const secondResp = await handleSavePrompt(
      makePostReq({
        name: "Second",
        promptTemplate: "A {{cat, dog}} in a forest",
        model: "z-image-pro",
        tags: JSON.stringify(["favorite"]),
      }),
    );
    expect(secondResp.status).toBe(200);

    const prompts = db.select().from(savedPrompt).all();
    expect(prompts).toHaveLength(1);
    expect(prompts[0]).toMatchObject({
      name: "Second",
      promptTemplate: "A {{cat, dog}} in a forest",
      model: "z-image-pro",
      tags: JSON.stringify(["favorite"]),
    });
  });
});

// --- DELETE handler ---
function makeDeleteReq(body: Record<string, unknown>): Request {
  return {
    json: () => Promise.resolve(body),
    url: "https://batchlyai.com/api/prompts",
    headers: new Headers(),
  } as unknown as Request;
}

describe("handleDeletePrompt", () => {
  let db: ReturnType<typeof createTestDb>;
  beforeEach(() => {
    db = createTestDb();
    applyMigrations(db);
    seedUser(db, { id: "u1" });
    vi.clearAllMocks();
    mocks.mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    (globalThis as any).__env__ = { batchlyai_db: db };
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as any).__env__;
  });

  it("returns 401 when not authenticated", async () => {
    mocks.mockGetSession.mockResolvedValue(null);
    const resp = await handleDeletePrompt(makeDeleteReq({}));
    expect(resp.status).toBe(401);
  });

  it("returns 400 when id is missing", async () => {
    const resp = await handleDeletePrompt(makeDeleteReq({}));
    expect(resp.status).toBe(400);
  });
});
