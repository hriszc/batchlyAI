import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { createTestDb, applyMigrations, seedUser } from "#test/db-setup";

const m = vi.hoisted(() => ({ s: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({ createAuth: () => ({ api: { getSession: m.s } }) }));
vi.mock("@/lib/db", () => ({ getDb: (b: any) => b }));
vi.mock("@/lib/cloudflare/bindings", () => ({
  getD1Binding: () => ((globalThis as any).__env__?.batchlyai_db as any) ?? undefined,
}));
vi.mock("@/lib/cloudflare/r2", () => ({
  mirrorImageToR2: vi.fn((url: string, key: string) =>
    Promise.resolve(`/api/generation-files/${key}`),
  ),
}));

import { eq } from "drizzle-orm";

import { mirrorImageToR2 } from "@/lib/cloudflare/r2";
import { generation } from "@/lib/db/schema/data-flywheel.schema";
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

  it("respects limit parameter", async () => {
    seedUser(db, { id: "u1" });
    const r = await handleGetGenerations({
      url: "https://x.com/api/generations?limit=5",
      headers: new Headers(),
    } as any);
    expect(r.status).toBe(200);
  });

  it("respects offset parameter", async () => {
    seedUser(db, { id: "u1" });
    const r = await handleGetGenerations({
      url: "https://x.com/api/generations?offset=10",
      headers: new Headers(),
    } as any);
    expect(r.status).toBe(200);
  });

  it("mirrors external result URLs to durable generation file URLs when reading history", async () => {
    seedUser(db, { id: "u1" });
    db.insert(generation)
      .values({
        id: "gen-1",
        userId: "u1",
        promptTemplate: "test",
        resolvedPrompts: JSON.stringify(["test"]),
        variableGroups: JSON.stringify([]),
        resultUrls: JSON.stringify(["https://replicate.delivery/tmp/output.png"]),
        model: "z-image-fast",
        creditsUsed: 1,
        createdAt: 1,
      })
      .run();

    const r = await handleGetGenerations(req());
    expect(r.status).toBe(200);
    const body = (await r.json()) as { generations: Array<{ resultUrls: string[] }> };

    expect(mirrorImageToR2).toHaveBeenCalledWith(
      "https://replicate.delivery/tmp/output.png",
      "generations/u1/gen-1/0.png",
    );
    expect(body.generations[0].resultUrls).toEqual([
      "/api/generation-files/generations/u1/gen-1/0.png",
    ]);

    const row = db
      .select({ resultUrls: generation.resultUrls })
      .from(generation)
      .where(eq(generation.id, "gen-1"))
      .get();
    expect(JSON.parse(row.resultUrls)).toEqual([
      "/api/generation-files/generations/u1/gen-1/0.png",
    ]);
  });
});
