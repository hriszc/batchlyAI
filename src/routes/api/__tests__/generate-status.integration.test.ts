import { eq } from "drizzle-orm";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { createTestDb, applyMigrations, seedUser } from "#test/db-setup";

const mocks = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockPollReplicate = vi.fn();
  const mockMirrorImageToR2 = vi.fn((url: string) => Promise.resolve(url));
  return { mockGetSession, mockPollReplicate, mockMirrorImageToR2 };
});

vi.mock("@/lib/auth/auth", () => ({
  createAuth: () => ({
    api: { getSession: mocks.mockGetSession },
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: () => ({ allowed: true, remaining: 59, resetAt: Date.now() + 60000 }),
}));

vi.mock("@/lib/ai", () => ({
  pollReplicatePrediction: mocks.mockPollReplicate,
}));

vi.mock("@/lib/cloudflare/r2", () => ({
  mirrorImageToR2: mocks.mockMirrorImageToR2,
}));

vi.mock("@/lib/db", () => ({
  getDb: (b: any) => b,
}));

import { generation } from "@/lib/db/schema/data-flywheel.schema";
import { handleGenerateStatus } from "@/routes/api/generate-status";

function makeRequest(params: string): Request {
  return {
    url: `https://batchlyai.com/api/generate-status?${params}`,
    headers: new Headers({ "CF-Connecting-IP": "1.2.3.4" }),
  } as unknown as Request;
}

describe("handleGenerateStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    delete (globalThis as Record<string, unknown>).__env__;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mocks.mockGetSession.mockResolvedValue(null);
    const resp = await handleGenerateStatus(makeRequest("ids=pred-1"));
    expect(resp.status).toBe(401);
  });

  it("allows guest polling with guest token", async () => {
    mocks.mockGetSession.mockResolvedValue(null);
    const mockKv = {
      get: vi.fn((key: string) => {
        if (key === "guest:pred-1") {
          return Promise.resolve(JSON.stringify({ guestToken: "guest-123" }));
        }
        return Promise.resolve(null);
      }),
    };
    (globalThis as Record<string, unknown>).__env__ = { batchlyai_kv: mockKv };

    const req = {
      url: "https://batchlyai.com/api/generate-status?ids=pred-1&type=replicate",
      headers: new Headers({ "x-guest-token": "guest-123" }),
    } as unknown as Request;
    mocks.mockPollReplicate.mockResolvedValue({
      id: "pred-1",
      status: "processing",
      urls: null,
      error: null,
    });
    const resp = await handleGenerateStatus(req);
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { results: { status: string }[] };
    expect(body.results[0].status).toBe("processing");
  });

  it("returns 400 when ids parameter is missing", async () => {
    const resp = await handleGenerateStatus(makeRequest("other=1"));
    expect(resp.status).toBe(400);
    const body = (await resp.json()) as { error: string };
    expect(body.error).toBe("Missing ids parameter");
  });

  // --- Replicate Polling (default type) ---
  it("returns processing status for in-progress Replicate predictions", async () => {
    mocks.mockPollReplicate.mockResolvedValue({
      id: "pred-1",
      status: "processing",
      urls: null,
      error: null,
    });

    const resp = await handleGenerateStatus(makeRequest("ids=pred-1&type=replicate"));
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as {
      results: { id: string; status: string; urls: string[] | null }[];
    };
    expect(body.results[0].id).toBe("pred-1");
    expect(body.results[0].status).toBe("processing");
  });

  it("returns succeeded with image URLs for completed Replicate predictions", async () => {
    mocks.mockPollReplicate.mockResolvedValue({
      id: "pred-1",
      status: "succeeded",
      urls: ["https://replicate.delivery/pbix/abc123/output-0.png"],
      error: null,
    });

    const resp = await handleGenerateStatus(makeRequest("ids=pred-1&type=replicate"));
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as {
      results: { id: string; status: string; urls: string[] }[];
    };
    expect(body.results[0].status).toBe("succeeded");
    expect(body.results[0].urls).toEqual(["https://replicate.delivery/pbix/abc123/output-0.png"]);
  });

  it("polls multiple Replicate IDs and returns results for all", async () => {
    mocks.mockPollReplicate
      .mockResolvedValueOnce({
        id: "pred-1",
        status: "succeeded",
        urls: ["https://replicate.delivery/img1.png"],
        error: null,
      })
      .mockResolvedValueOnce({
        id: "pred-2",
        status: "processing",
        urls: null,
        error: null,
      });

    const resp = await handleGenerateStatus(makeRequest("ids=pred-1,pred-2&type=replicate"));
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as {
      results: { id: string; status: string; urls: string[] | null }[];
    };
    expect(body.results).toHaveLength(2);
    expect(body.results[0].status).toBe("succeeded");
    expect(body.results[1].status).toBe("processing");
  });

  it("handles Replicate poll errors gracefully", async () => {
    mocks.mockPollReplicate.mockRejectedValue(new Error("Network error"));

    const resp = await handleGenerateStatus(makeRequest("ids=pred-1&type=replicate"));
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as {
      results: { id: string; status: string; error: string }[];
    };
    expect(body.results[0].status).toBe("error");
    expect(body.results[0].error).toBe("Network error");
  });

  // --- GRS Polling (KV-based) ---
  it("returns processing when GRS task is still processing in KV", async () => {
    const mockKv = {
      get: vi.fn().mockResolvedValue(JSON.stringify({ userId: "u1", status: "processing" })),
    };
    (globalThis as Record<string, unknown>).__env__ = { batchlyai_kv: mockKv };

    const resp = await handleGenerateStatus(makeRequest("ids=grs-1&type=grs"));
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as {
      results: { id: string; status: string }[];
    };
    expect(body.results[0].status).toBe("processing");
  });

  it("returns succeeded with image URLs when GRS webhook has completed", async () => {
    const taskData = {
      userId: "u1",
      status: "succeeded",
      urls: ["https://grs-cdn.com/output/image1.png", "https://grs-cdn.com/output/image2.png"],
    };
    const mockKv = {
      get: vi.fn().mockResolvedValue(JSON.stringify(taskData)),
    };
    (globalThis as Record<string, unknown>).__env__ = { batchlyai_kv: mockKv };

    const resp = await handleGenerateStatus(makeRequest("ids=grs-1&type=grs"));
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as {
      results: { id: string; status: string; urls: string[] }[];
    };
    expect(body.results[0].status).toBe("succeeded");
    expect(body.results[0].urls).toEqual([
      "https://grs-cdn.com/output/image1.png",
      "https://grs-cdn.com/output/image2.png",
    ]);
  });

  it("returns failed with error when GRS webhook reports failure", async () => {
    const taskData = {
      userId: "u1",
      status: "failed",
      error: "NSFW content detected",
    };
    const mockKv = {
      get: vi.fn().mockResolvedValue(JSON.stringify(taskData)),
    };
    (globalThis as Record<string, unknown>).__env__ = { batchlyai_kv: mockKv };

    const resp = await handleGenerateStatus(makeRequest("ids=grs-1&type=grs"));
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as {
      results: { id: string; status: string; error: string }[];
    };
    expect(body.results[0].status).toBe("failed");
    expect(body.results[0].error).toBe("NSFW content detected");
  });

  it("returns processing when KV key does not exist yet", async () => {
    const mockKv = { get: vi.fn().mockResolvedValue(null) };
    (globalThis as Record<string, unknown>).__env__ = { batchlyai_kv: mockKv };

    const resp = await handleGenerateStatus(makeRequest("ids=grs-1&type=grs"));
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as {
      results: { id: string; status: string }[];
    };
    expect(body.results[0].status).toBe("processing");
  });

  it("returns error when KV is not available", async () => {
    // No __env__ set — KV not available
    const resp = await handleGenerateStatus(makeRequest("ids=grs-1&type=grs"));
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as {
      results: { id: string; status: string; error: string }[];
    };
    expect(body.results[0].status).toBe("error");
    expect(body.results[0].error).toBe("KV not available");
  });

  it("rejects replicate polling for mismatched guest token", async () => {
    const mockKv = {
      get: vi.fn((key: string) => {
        if (key === "guest:pred-1") {
          return Promise.resolve(JSON.stringify({ guestToken: "guest-abc" }));
        }
        return Promise.resolve(null);
      }),
    };
    (globalThis as Record<string, unknown>).__env__ = { batchlyai_kv: mockKv };
    mocks.mockGetSession.mockResolvedValue(null);

    const req = {
      url: "https://batchlyai.com/api/generate-status?ids=pred-1&type=replicate",
      headers: new Headers({ "x-guest-token": "guest-wrong" }),
    } as unknown as Request;
    const resp = await handleGenerateStatus(req);
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { results: { status: string; error: string }[] };
    expect(body.results[0].status).toBe("error");
    expect(body.results[0].error).toBe("Not found");
  });

  // --- Generation record update via poll results ---
  it("updates generation resultUrls when Replicate poll returns succeeded", async () => {
    const db = createTestDb();
    applyMigrations(db);
    seedUser(db, { id: "u1" });

    // Pre-insert generation record
    const genId = "gen-test-001";
    db.insert(generation)
      .values({
        id: genId,
        userId: "u1",
        promptTemplate: "test prompt",
        resolvedPrompts: JSON.stringify(["test prompt"]),
        variableGroups: JSON.stringify([]),
        resultUrls: JSON.stringify([]),
        model: "z-image-fast",
        creditsUsed: 10,
        createdAt: Math.floor(Date.now() / 1000),
      })
      .run();

    // Set up KV with generation mapping
    const kvStore = new Map<string, string>();
    kvStore.set("gen:pred-abc", JSON.stringify({ generationId: genId }));
    const mockKv = {
      get: vi.fn((key: string) => Promise.resolve(kvStore.get(key) ?? null)),
      put: vi.fn(),
    };

    (globalThis as Record<string, unknown>).__env__ = {
      batchlyai_kv: mockKv,
      batchlyai_db: db,
    };

    mocks.mockPollReplicate.mockResolvedValue({
      id: "pred-abc",
      status: "succeeded",
      urls: ["https://replicate.delivery/test-output.png"],
      error: null,
    });

    await handleGenerateStatus(makeRequest("ids=pred-abc&type=replicate"));

    // Wait for async update
    await new Promise((r) => setTimeout(r, 100));

    // Verify generation was updated
    const row = db
      .select({ resultUrls: generation.resultUrls })
      .from(generation)
      .where(eq(generation.id, genId))
      .get();
    expect(row).toBeDefined();
    const urls = JSON.parse(row!.resultUrls);
    expect(urls).toEqual(["https://replicate.delivery/test-output.png"]);
  });

  it("appends resultUrls when multiple async tasks finish for one generation", async () => {
    const db = createTestDb();
    applyMigrations(db);
    seedUser(db, { id: "u1" });

    const genId = "gen-test-append";
    db.insert(generation)
      .values({
        id: genId,
        userId: "u1",
        promptTemplate: "test prompt",
        resolvedPrompts: JSON.stringify(["test prompt"]),
        variableGroups: JSON.stringify([]),
        resultUrls: JSON.stringify([]),
        model: "z-image-pro",
        creditsUsed: 40,
        createdAt: Math.floor(Date.now() / 1000),
      })
      .run();

    const kvStore = new Map<string, string>();
    kvStore.set("gen:grs-a", JSON.stringify({ generationId: genId, userId: "u1" }));
    kvStore.set("gen:grs-b", JSON.stringify({ generationId: genId, userId: "u1" }));
    kvStore.set(
      "grs:grs-a",
      JSON.stringify({ userId: "u1", status: "succeeded", urls: ["https://cdn/a.png"] }),
    );
    kvStore.set(
      "grs:grs-b",
      JSON.stringify({ userId: "u1", status: "succeeded", urls: ["https://cdn/b.png"] }),
    );
    const mockKv = {
      get: vi.fn((key: string) => Promise.resolve(kvStore.get(key) ?? null)),
      put: vi.fn(),
    };

    (globalThis as Record<string, unknown>).__env__ = {
      batchlyai_kv: mockKv,
      batchlyai_db: db,
    };

    const resp = await handleGenerateStatus(makeRequest("ids=grs-a,grs-b&type=grs"));
    expect(resp.status).toBe(200);

    const row = db
      .select({ resultUrls: generation.resultUrls })
      .from(generation)
      .where(eq(generation.id, genId))
      .get();
    expect(JSON.parse(row!.resultUrls)).toEqual(["https://cdn/a.png", "https://cdn/b.png"]);
  });

  it("does not update generation when KV entry is missing", async () => {
    const db = createTestDb();
    applyMigrations(db);
    seedUser(db, { id: "u1" });

    const genId = "gen-test-002";
    db.insert(generation)
      .values({
        id: genId,
        userId: "u1",
        promptTemplate: "test",
        resolvedPrompts: JSON.stringify(["test"]),
        variableGroups: JSON.stringify([]),
        resultUrls: JSON.stringify([]),
        model: "z-image-fast",
        creditsUsed: 10,
        createdAt: Math.floor(Date.now() / 1000),
      })
      .run();

    // NO KV entry for this prediction
    const mockKv = {
      get: vi.fn(() => Promise.resolve(null)),
      put: vi.fn(),
    };
    (globalThis as Record<string, unknown>).__env__ = {
      batchlyai_kv: mockKv,
      batchlyai_db: db,
    };

    mocks.mockPollReplicate.mockResolvedValue({
      id: "pred-missing",
      status: "succeeded",
      urls: ["https://example.com/img.png"],
      error: null,
    });

    await handleGenerateStatus(makeRequest("ids=pred-missing&type=replicate"));
    await new Promise((r) => setTimeout(r, 100));

    // Generation should still have empty resultUrls
    const row = db
      .select({ resultUrls: generation.resultUrls })
      .from(generation)
      .where(eq(generation.id, genId))
      .get();
    const urls = JSON.parse(row!.resultUrls);
    expect(urls).toEqual([]);
  });
});
