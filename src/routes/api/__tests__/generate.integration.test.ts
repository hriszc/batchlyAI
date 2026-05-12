import { eq } from "drizzle-orm";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { user as userTable } from "@/lib/db/schema/auth.schema";
import { creditAuditEvent } from "@/lib/db/schema/credit-audit.schema";
import { generation, savedPrompt } from "@/lib/db/schema/data-flywheel.schema";

import { createTestDb, applyMigrations, seedUser } from "../../../../tests/db-setup";
import { handleGenerate, CREDIT_COST } from "../generate";

function makeRequest(body: Record<string, unknown>): Request {
  return {
    json: () => Promise.resolve(body),
  } as unknown as Request;
}

function makePrediction(id: string) {
  return { id, status: "processing" };
}

function getCreditsForUser(db: ReturnType<typeof createTestDb>, userId: string): number {
  const row = db
    .select({ credits: userTable.credits })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .get();
  return row?.credits ?? 0;
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
    return getCreditsForUser(db, userId);
  }

  // --- Validation ---
  it("returns 400 for missing prompt", async () => {
    const resp = await handleGenerate({
      request: makeRequest({}),
      db,
      userId,
      grsaiFn: vi.fn(),
    } as any);
    expect(resp.status).toBe(400);
    const body = (await resp.json()) as { error: string; details: Record<string, unknown> };
    expect(body.error).toBe("Invalid request");
    expect(body.details).toBeDefined();
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
      grsaiFn: vi.fn(),
    } as any);
    expect(resp.status).toBe(402);
    const body = (await resp.json()) as { error: string; required: number };
    expect(body.error).toBe("Insufficient credits");
    expect(body.required).toBe(60);
  });

  // --- Generation (now all async) ---
  it("sends pro model to GRS AI and returns async prediction IDs", async () => {
    const mockGrsai = vi.fn().mockResolvedValue([makePrediction("grs-001")]);

    const resp = await handleGenerate({
      request: makeRequest({ prompt: "test", n: 1, model: "z-image-pro" }),
      db,
      userId,
      grsaiFn: mockGrsai,
    } as any);
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as {
      predictionIds: string[];
      async: boolean;
      creditsRemaining: number;
    };
    expect(body.async).toBe(true);
    expect(body.predictionIds).toEqual(["grs-001"]);
    expect(body.creditsRemaining).toBeGreaterThan(0);
  });

  it("refunds all credits on generation failure", async () => {
    const mockGrsai = vi.fn().mockRejectedValue(new Error("API down"));

    const resp = await handleGenerate({
      request: makeRequest({ prompt: "test", n: 1, model: "z-image-pro" }),
      db,
      userId,
      grsaiFn: mockGrsai,
    } as any);
    expect(resp.status).toBe(500);

    // Credits should be fully restored
    expect(getCredits()).toBe(100);
  });

  // --- Fast model (Replicate) ---
  it("z-image-fast uses replicate and returns async prediction IDs", async () => {
    const mockReplicate = vi.fn().mockResolvedValue([makePrediction("pred-001")]);

    const resp = await handleGenerate({
      request: makeRequest({
        prompt: "test",
        n: 2,
        model: "z-image-fast",
        attachedUrls: ["https://r2.example.com/uploads/ref.png"],
      }),
      db,
      userId,
      replicateFn: mockReplicate,
    } as any);
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { predictionIds: string[]; async: boolean };
    expect(body.async).toBe(true);
    expect(body.predictionIds).toEqual(["pred-001"]);
    expect(mockReplicate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "z-image-fast",
        urls: ["https://r2.example.com/uploads/ref.png"],
      }),
    );
  });

  it("records AI credit spend audit event", async () => {
    const mockReplicate = vi.fn().mockResolvedValue([makePrediction("audit-pred-001")]);

    const resp = await handleGenerate({
      request: makeRequest({ prompt: "audit test", n: 1, model: "z-image-fast" }),
      db,
      userId,
      replicateFn: mockReplicate,
    } as any);

    expect(resp.status).toBe(200);
    const [event] = await db
      .select()
      .from(creditAuditEvent)
      .where(eq(creditAuditEvent.eventType, "spend"));
    expect(event).toEqual(
      expect.objectContaining({
        userId,
        source: "ai_api",
        provider: "replicate",
        model: "z-image-fast",
        apiCallCount: 1,
        creditsDelta: -10,
      }),
    );
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
      grsaiFn: vi.fn(),
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

  it("rejects unknown model with validation error", async () => {
    const mockGrsai = vi.fn().mockResolvedValue([makePrediction("grs-001")]);
    const resp = await handleGenerate({
      request: makeRequest({ prompt: "test", model: "unknown-model" }),
      db,
      userId,
      grsaiFn: mockGrsai,
    } as any);
    expect(resp.status).toBe(400);
    const body = (await resp.json()) as { error: string };
    expect(body.error).toBe("Invalid request");
  });

  // --- Video model (Replicate) ---
  it("z-video-fast uses replicate and returns async prediction IDs", async () => {
    const mockReplicate = vi.fn().mockResolvedValue([makePrediction("vid-001")]);

    const resp = await handleGenerate({
      request: makeRequest({
        prompt: "a sunset",
        n: 1,
        model: "z-video-fast",
        duration: 1,
        attachedUrls: ["https://r2.example.com/uploads/video-ref.png"],
      }),
      db,
      userId,
      replicateFn: mockReplicate,
    } as any);
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { predictionIds: string[]; async: boolean };
    expect(body.predictionIds).toEqual(["vid-001"]);
    expect(body.async).toBe(true);
    expect(mockReplicate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "z-video-fast",
        duration: 1,
        urls: ["https://r2.example.com/uploads/video-ref.png"],
      }),
    );
  });

  it("z-video-fast refunds on API failure", async () => {
    const mockReplicate = vi.fn().mockRejectedValue(new Error("Replicate down"));

    const resp = await handleGenerate({
      request: makeRequest({ prompt: "a sunset", n: 1, model: "z-video-fast", duration: 1 }),
      db,
      userId,
      replicateFn: mockReplicate,
    } as any);
    expect(resp.status).toBe(500);
    expect(getCredits()).toBe(100);
  });

  // --- Credit deduction correctness ---
  it("deducts correct amount for n > 1", async () => {
    const mockGrsai = vi
      .fn()
      .mockResolvedValue([
        makePrediction("grs-001"),
        makePrediction("grs-002"),
        makePrediction("grs-003"),
      ]);

    await handleGenerate({
      request: makeRequest({ prompt: "test", n: 3, model: "z-image-pro" }),
      db,
      userId,
      grsaiFn: mockGrsai,
    } as any);

    // 3 prompts × 20 credits each = 60 credits deducted
    expect(getCredits()).toBe(40);
  });

  it("deducts video credits by duration", async () => {
    const videoUserId = seedUser(db, { id: "video-user", credits: 1000, email: "video@test.com" });
    const mockReplicate = vi.fn().mockResolvedValue([makePrediction("vid-cost-001")]);

    await handleGenerate({
      request: makeRequest({ prompt: "test", n: 2, model: "z-video-fast", duration: 10 }),
      db,
      userId: videoUserId,
      replicateFn: mockReplicate,
    } as any);

    expect(getCreditsForUser(db, videoUserId)).toBe(200);
  });

  it("preserves credits when n=1 with pro model", async () => {
    const mockGrsai = vi.fn().mockResolvedValue([makePrediction("grs-single")]);

    await handleGenerate({
      request: makeRequest({ prompt: "test", n: 1, model: "z-image-pro" }),
      db,
      userId,
      grsaiFn: mockGrsai,
    } as any);

    expect(getCredits()).toBe(80); // 100 - 20
  });

  // --- Generation saving with template ---
  it("saves generation record with promptTemplate and variableGroups", async () => {
    const mockGrsai = vi.fn().mockResolvedValue([makePrediction("grs-xyz")]);

    await handleGenerate({
      request: makeRequest({
        prompt: "A cat in a forest",
        n: 1,
        model: "z-image-pro",
        promptTemplate: "A {{cat, dog}} in a {{forest, beach}}",
        variableGroups: [
          { id: "var_0", values: ["cat", "dog"] },
          { id: "var_1", values: ["forest", "beach"] },
        ],
      }),
      db,
      userId,
      grsaiFn: mockGrsai,
    } as any);

    const rows = db.select().from(generation).all();
    expect(rows.length).toBe(1);
    expect(rows[0].promptTemplate).toBe("A {{cat, dog}} in a {{forest, beach}}");
    expect(rows[0].resolvedPrompts).toBe(JSON.stringify(["A cat in a forest"]));
    const parsedGroups = JSON.parse(rows[0].variableGroups);
    expect(parsedGroups).toHaveLength(2);
  });

  it("falls back to resolved prompt as template when promptTemplate not sent", async () => {
    const mockGrsai = vi.fn().mockResolvedValue([makePrediction("grs-fb")]);

    await handleGenerate({
      request: makeRequest({
        prompt: "A simple prompt",
        n: 1,
        model: "z-image-pro",
      }),
      db,
      userId,
      grsaiFn: mockGrsai,
    } as any);

    const rows = db.select().from(generation).all();
    expect(rows.length).toBe(1);
    expect(rows[0].promptTemplate).toBe("A simple prompt");
    expect(rows[0].variableGroups).toBe("[]");
  });

  // --- Saved prompt dedup ---
  it("does not create duplicate savedPrompt for same template", async () => {
    const mockGrsai = vi
      .fn()
      .mockResolvedValue([makePrediction("grs-001")])
      .mockResolvedValue([makePrediction("grs-002")]);

    const makeBody = (resolvedPrompt: string) => ({
      prompt: resolvedPrompt,
      n: 1,
      model: "z-image-pro",
      promptTemplate: "{{cat, dog}} in a forest",
      variableGroups: [{ id: "var_0", values: ["cat", "dog"] }],
    });

    await handleGenerate({
      request: makeRequest(makeBody("cat in a forest")),
      db,
      userId,
      grsaiFn: mockGrsai,
    } as any);

    await handleGenerate({
      request: makeRequest(makeBody("dog in a forest")),
      db,
      userId,
      grsaiFn: mockGrsai,
    } as any);

    const prompts = db.select().from(savedPrompt).all();
    expect(prompts.length).toBe(1);
    expect(prompts[0].promptTemplate).toBe("{{cat, dog}} in a forest");
  });

  it("creates separate savedPrompts for different templates", async () => {
    const mockGrsai = vi
      .fn()
      .mockResolvedValue([makePrediction("grs-a")])
      .mockResolvedValue([makePrediction("grs-b")]);

    await handleGenerate({
      request: makeRequest({
        prompt: "cat",
        n: 1,
        model: "z-image-pro",
        promptTemplate: "{{cat, dog}}",
        variableGroups: [{ id: "var_0", values: ["cat", "dog"] }],
      }),
      db,
      userId,
      grsaiFn: mockGrsai,
    } as any);

    await handleGenerate({
      request: makeRequest({
        prompt: "beach",
        n: 1,
        model: "z-image-pro",
        promptTemplate: "{{forest, beach}}",
        variableGroups: [{ id: "var_0", values: ["forest", "beach"] }],
      }),
      db,
      userId,
      grsaiFn: mockGrsai,
    } as any);

    const prompts = db.select().from(savedPrompt).all();
    expect(prompts.length).toBe(2);
  });
});

describe("generate → poll status pipeline (simulated AI image return)", () => {
  let db: ReturnType<typeof createTestDb>;
  let userId: string;

  beforeEach(() => {
    vi.restoreAllMocks();
    db = createTestDb();
    applyMigrations(db);
    userId = seedUser(db, { id: "test-user-001", credits: 200 });
  });

  it("returns prediction IDs that can be polled for image URLs", async () => {
    // Step 1: Call generate to create async predictions
    const mockGrsai = vi
      .fn()
      .mockResolvedValue([makePrediction("grs-img-001"), makePrediction("grs-img-002")]);

    const genResp = await handleGenerate({
      request: makeRequest({ prompt: "sunset", n: 2, model: "z-image-pro" }),
      db,
      userId,
      grsaiFn: mockGrsai,
    } as any);

    expect(genResp.status).toBe(200);
    const genBody = (await genResp.json()) as {
      predictionIds: string[];
      async: boolean;
      modelType: string;
    };
    expect(genBody.predictionIds).toEqual(["grs-img-001", "grs-img-002"]);
    expect(genBody.async).toBe(true);
    expect(genBody.modelType).toBe("grs");

    // Step 2: Simulate the frontend polling — verify the prediction IDs
    // are in the format the frontend expects for /api/generate-status
    expect(genBody.predictionIds.every((id) => typeof id === "string")).toBe(true);
    expect(genBody.predictionIds.every((id) => id.length > 0)).toBe(true);
  });

  it("cache hit returns image URLs immediately (simulated)", async () => {
    const cachedUrls = [
      "https://replicate.delivery/pbix/xyz/output-0.png",
      "https://replicate.delivery/pbix/xyz/output-1.png",
    ];
    const mockGetCache = vi.fn().mockResolvedValue(cachedUrls);

    const resp = await handleGenerate({
      request: makeRequest({ prompt: "cached sunset", n: 2, model: "z-image-pro" }),
      db,
      userId,
      grsaiFn: vi.fn(),
      getCachedFn: mockGetCache,
    } as any);

    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { urls: string[]; cached: boolean };
    expect(body.cached).toBe(true);
    expect(body.urls).toEqual(cachedUrls);
    // Each URL should be a valid image URL the frontend can render
    expect(body.urls.every((url) => url.startsWith("https://"))).toBe(true);
  });

  it("Replicate prediction IDs are formatted for polling", async () => {
    const mockReplicate = vi.fn().mockResolvedValue([{ id: "rep-pred-abc", status: "starting" }]);

    const resp = await handleGenerate({
      request: makeRequest({ prompt: "forest", n: 1, model: "z-image-fast" }),
      db,
      userId,
      replicateFn: mockReplicate,
    } as any);

    expect(resp.status).toBe(200);
    const body = (await resp.json()) as {
      predictionIds: string[];
      modelType: string;
    };
    expect(body.predictionIds).toEqual(["rep-pred-abc"]);
    expect(body.modelType).toBe("replicate");
  });

  it("deducts credits before returning prediction IDs (no credit leak)", async () => {
    const checkUserId = seedUser(db, { id: "credit-check", credits: 100, email: "cc@t.com" });
    const mockGrsai = vi.fn().mockResolvedValue([makePrediction("grs-check")]);

    await handleGenerate({
      request: makeRequest({ prompt: "test", n: 2, model: "z-image-pro" }),
      db,
      userId: checkUserId,
      grsaiFn: mockGrsai,
    } as any);

    // 2 × 20 credits = 40 deducted
    expect(getCreditsForUser(db, checkUserId)).toBe(60);
  });

  // --- GRS sync response ---
  it("returns URLs synchronously when GRS returns results directly", async () => {
    const mockGrsai = vi.fn().mockResolvedValue([
      {
        id: "grs-sync-test",
        status: "succeeded" as const,
        urls: ["https://aigate.com/output/img.png"],
      },
    ]);

    const resp = await handleGenerate({
      request: makeRequest({ prompt: "test", n: 1, model: "z-image-pro" }),
      db,
      userId,
      grsaiFn: mockGrsai,
    } as any);
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { urls: string[]; sync: boolean };
    expect(body.urls).toEqual(["https://aigate.com/output/img.png"]);
  });
});
