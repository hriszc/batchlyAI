import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { createTestDb, applyMigrations, seedUser } from "#test/db-setup";

const m = vi.hoisted(() => ({ s: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({ createAuth: () => ({ api: { getSession: m.s } }) }));
vi.mock("@/lib/db", () => ({ getDb: (b: any) => b }));
vi.mock("@/lib/cloudflare/bindings", () => ({ getD1Binding: () => ((globalThis as any).__env__?.batchlyai_db as any) ?? undefined }));

import { handleGetGenerations } from "@/routes/api/generations";
function req(url = "https://x.com/api/generations"): Request {
  return { url, headers: new Headers() } as any;
}

describe("handleGetGenerations", () => {
  let db: any;
  beforeEach(() => {
    db = createTestDb();
    applyMigrations(db);
    vi.clearAllMocks();
    m.s.mockResolvedValue({ user: { id: "u1" } });
    (globalThis as any).__env__ = { batchlyai_db: db };
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as any).__env__;
  });
  it("401 when unauthenticated", async () => {
    m.s.mockResolvedValue(null);
    expect((await handleGetGenerations(req())).status).toBe(401);
  });
  it("501 when DB missing", async () => {
    delete (globalThis as any).__env__;
    expect((await handleGetGenerations(req())).status).toBe(501);
  });
  it("200 with empty list for new user", async () => {
    seedUser(db, { id: "u1" });
    const r = await handleGetGenerations(req());
    expect(r.status).toBe(200);
    expect(((await r.json()) as any).generations).toEqual([]);
  });
});
