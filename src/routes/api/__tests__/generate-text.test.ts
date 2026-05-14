import { describe, it, expect, vi, beforeEach } from "vitest";

import { createTestDb, applyMigrations, seedUser } from "#test/db-setup";
import { handleGenerate } from "@/routes/api/generate";

function makeRequest(body: Record<string, unknown>): Request {
  return { json: () => Promise.resolve(body) } as unknown as Request;
}

describe("handleGenerate — text model path", () => {
  let db: ReturnType<typeof createTestDb>;
  let userId: string;

  beforeEach(() => {
    vi.restoreAllMocks();
    db = createTestDb();
    applyMigrations(db);
    userId = seedUser(db, { id: "text-user", credits: 100 });
  });

  it("text model returns texts array on success", async () => {
    const mockTextFn = vi.fn().mockResolvedValue("Generated poem about testing");

    const resp = await handleGenerate({
      request: makeRequest({ prompt: "write a poem", n: 1, model: "z-text-fast" }),
      db,
      userId,
      textFn: mockTextFn,
    } as any);
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { texts: string[]; isText: boolean };
    expect(body.texts).toEqual(["Generated poem about testing"]);
    expect(body.isText).toBe(true);
  });

  it("text model deducts correct credits for n=1", async () => {
    const mockTextFn = vi.fn().mockResolvedValue("Short text");
    await handleGenerate({
      request: makeRequest({ prompt: "test", n: 1, model: "z-text-fast" }),
      db,
      userId,
      textFn: mockTextFn,
    } as any);
    // z-text-fast = 5 credits per unit
    const row = db.get(`SELECT credits FROM user WHERE id = '${userId}'`) as any;
    expect(row?.credits).toBe(95);
  });

  it("text model refunds credits on failure", async () => {
    const mockTextFn = vi.fn().mockRejectedValue(new Error("LLM crash"));
    const resp = await handleGenerate({
      request: makeRequest({ prompt: "test", n: 1, model: "z-text-fast" }),
      db,
      userId,
      textFn: mockTextFn,
    } as any);
    expect(resp.status).toBe(500);
    const body = (await resp.json()) as { creditsRemaining: number };
    expect(body.creditsRemaining).toBe(100);
    const row = db.get(`SELECT credits FROM user WHERE id = '${userId}'`) as any;
    expect(row?.credits).toBe(100); // fully refunded
  });

  it("caches text results after successful generation", async () => {
    const mockTextFn = vi.fn().mockResolvedValue("Cache me");
    const mockSetCache = vi.fn().mockResolvedValue(undefined);

    await handleGenerate({
      request: makeRequest({ prompt: "test", n: 1, model: "z-text-fast" }),
      db,
      userId,
      textFn: mockTextFn,
      setCachedFn: mockSetCache,
    } as any);
    expect(mockSetCache).toHaveBeenCalled();
  });

  it("text-pro uses deepseek-v4-pro model", async () => {
    const mockTextFn = vi.fn().mockResolvedValue("Pro response");
    await handleGenerate({
      request: makeRequest({ prompt: "deep question", n: 1, model: "z-text-pro" }),
      db,
      userId,
      textFn: mockTextFn,
    } as any);
    expect(mockTextFn).toHaveBeenCalledWith(expect.objectContaining({ model: "deepseek-v4-pro" }));
  });

  it("multi-text generates n parallel calls", async () => {
    const mockTextFn = vi.fn().mockResolvedValue("text piece");
    await handleGenerate({
      request: makeRequest({ prompt: "poems", n: 3, model: "z-text-fast" }),
      db,
      userId,
      textFn: mockTextFn,
    } as any);
    expect(mockTextFn).toHaveBeenCalledTimes(3);
  });
});
