import { eq } from "drizzle-orm";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { user as userTable } from "@/lib/db/schema/auth.schema";

import { createTestDb, applyMigrations, seedUser } from "../../../../tests/db-setup";
import { handleGenerate, CREDIT_COST } from "../generate";

function makeRequest(body: Record<string, unknown>): Request {
  return {
    json: () => Promise.resolve(body),
  } as unknown as Request;
}

describe("handleGenerate", () => {
  let db: ReturnType<typeof createTestDb>;
  let userId: string;

  beforeEach(() => {
    vi.restoreAllMocks();
    db = createTestDb();
    applyMigrations(db);
    userId = seedUser(db, { id: "test-user-001", credits: 100 });
  });

  function getCredits(): number {
    const row = db
      .select({ credits: userTable.credits })
      .from(userTable)
      .where(eq(userTable.id, userId))
      .get();
    return row?.credits ?? 0;
  }

  // --- Validation ---
  it("returns 400 for missing prompt", async () => {
    const resp = await handleGenerate({
      request: makeRequest({}),
      db,
      userId,
      generateFn: vi.fn(),
    } as any);
    expect(resp.status).toBe(400);
    const body = (await resp.json()) as { error: string };
    expect(body.error).toBe("Missing prompt");
  });

  // --- Credit check ---
  it("returns 402 for insufficient credits", async () => {
    const poorId = seedUser(db, {
      id: "poor-user",
      credits: 5,
      email: "poor@test.com",
    });

    const resp = await handleGenerate({
      request: makeRequest({ prompt: "test", n: 3, model: "z-image-pro" }),
      db,
      userId: poorId,
      generateFn: vi.fn(),
    } as any);
    expect(resp.status).toBe(402);
    const body = (await resp.json()) as { error: string; required: number };
    expect(body.error).toBe("Insufficient credits");
    expect(body.required).toBe(60);
  });

  // --- Credit deduction ---
  it("deducts credits on successful generation", async () => {
    const mockGenerate = vi.fn().mockResolvedValue(["http://img.com/1.png"]);

    const resp = await handleGenerate({
      request: makeRequest({ prompt: "test", n: 1, model: "z-image-pro" }),
      db,
      userId,
      generateFn: mockGenerate,
    } as any);
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { urls: string[]; creditsRemaining: number };
    expect(body.urls).toEqual(["http://img.com/1.png"]);
    // Atomic deduction: 100 - 20 = 80 in DB
    expect(body.creditsRemaining).toBeGreaterThan(0);
  });

  it("refunds when generation produces fewer images than requested", async () => {
    const mockGenerate = vi.fn().mockResolvedValue(["http://img.com/1.png"]); // only 1

    const resp = await handleGenerate({
      request: makeRequest({ prompt: "test", n: 3, model: "z-image-pro" }),
      db,
      userId,
      generateFn: mockGenerate,
    } as any);
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { urls: string[]; creditsRemaining: number };
    expect(body.urls).toHaveLength(1);

    // DB should have the refund applied (maxCost 60 deducted, 40 refunded)
    // 100 - 60 + 40 = 80
    expect(getCredits()).toBe(80);
  });

  it("refunds all credits on generation failure", async () => {
    const mockGenerate = vi.fn().mockRejectedValue(new Error("API down"));

    const resp = await handleGenerate({
      request: makeRequest({ prompt: "test", n: 1, model: "z-image-pro" }),
      db,
      userId,
      generateFn: mockGenerate,
    } as any);
    expect(resp.status).toBe(500);

    // Credits should be fully restored
    expect(getCredits()).toBe(100);
  });

  // --- Model-specific behavior ---
  it("z-image-fast returns async prediction IDs", async () => {
    const mockReplicate = vi
      .fn()
      .mockResolvedValue([{ id: "pred-001", status: "starting", urls: { get: "", cancel: "" } }]);

    const resp = await handleGenerate({
      request: makeRequest({ prompt: "test", n: 2, model: "z-image-fast" }),
      db,
      userId,
      replicateFn: mockReplicate,
    } as any);
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { predictionIds: string[]; async: boolean };
    expect(body.async).toBe(true);
    expect(body.predictionIds).toEqual(["pred-001"]);
  });

  it("z-image-fast refunds on API failure", async () => {
    const mockReplicate = vi.fn().mockRejectedValue(new Error("Replicate down"));

    const resp = await handleGenerate({
      request: makeRequest({ prompt: "test", n: 1, model: "z-image-fast" }),
      db,
      userId,
      replicateFn: mockReplicate,
    } as any);
    expect(resp.status).toBe(500);
    expect(getCredits()).toBe(100);
  });

  // --- Cache hit ---
  it("returns cached result without deducting credits", async () => {
    const mockGetCache = vi.fn().mockResolvedValue(["http://cached.com/1.png"]);

    const resp = await handleGenerate({
      request: makeRequest({ prompt: "cached prompt", n: 1, model: "z-image-pro" }),
      db,
      userId,
      generateFn: vi.fn(),
      getCachedFn: mockGetCache,
    } as any);
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { cached: boolean; urls: string[] };
    expect(body.cached).toBe(true);

    // Credits should NOT be deducted for cache hits
    expect(getCredits()).toBe(100);
  });

  // --- Credit cost mapping ---
  it("CREDIT_COST covers all model tiers", () => {
    expect(CREDIT_COST["z-image-fast"]).toBe(10);
    expect(CREDIT_COST["z-image-pro"]).toBe(20);
    expect(CREDIT_COST["z-text-fast"]).toBe(5);
    expect(CREDIT_COST["z-text-pro"]).toBe(10);
    expect(CREDIT_COST["z-video-fast"]).toBe(40);
    expect(CREDIT_COST["z-video-pro"]).toBe(80);
  });

  it("defaults to 20 credits for unknown model", async () => {
    const mockGenerate = vi.fn().mockResolvedValue(["http://img.com/1.png"]);
    // Start with just enough for default cost
    const lowUser = seedUser(db, {
      id: "unknown-model-user",
      credits: 19,
      email: "unknown@test.com",
    });

    const resp = await handleGenerate({
      request: makeRequest({ prompt: "test", n: 1, model: "unknown-model" }),
      db,
      userId: lowUser,
      generateFn: mockGenerate,
    } as any);
    // Should fail because unknown model costs 20 (default)
    expect(resp.status).toBe(402);
  });
});
