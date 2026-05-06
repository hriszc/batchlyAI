import { eq } from "drizzle-orm";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { createTestDb, applyMigrations, seedUser } from "#test/db-setup";
import { user as userTable, referralCode } from "@/lib/db/schema";

const mocks = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  return { mockGetSession };
});

vi.mock("@/lib/auth/auth", () => ({
  createAuth: () => ({
    api: { getSession: mocks.mockGetSession },
  }),
}));

vi.mock("@/lib/db", () => ({
  getDb: (binding: unknown) => binding as ReturnType<typeof createTestDb>,
}));

import { handleReferralGenerateCode } from "@/routes/api/referral/generate-code";

function makeRequest(url?: string): Request {
  return {
    url: url ?? "https://batchlyai.com/api/referral/generate-code",
  } as unknown as Request;
}

describe("handleReferralGenerateCode", () => {
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
    const resp = await handleReferralGenerateCode(makeRequest());
    expect(resp.status).toBe(401);
  });

  it("returns 501 when DB is unavailable", async () => {
    delete (globalThis as Record<string, unknown>).__env__;
    const resp = await handleReferralGenerateCode(makeRequest());
    expect(resp.status).toBe(501);
  });

  it("returns 403 when user has default credits (no activity)", async () => {
    seedUser(db, { id: "u1", credits: 10 });
    const resp = await handleReferralGenerateCode(makeRequest());
    expect(resp.status).toBe(403);
  });

  it("returns 200 with code when user has spent credits", async () => {
    seedUser(db, { id: "u1", credits: 5 });
    const resp = await handleReferralGenerateCode(makeRequest());
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { code: string; shareUrl: string };
    expect(body.code).toHaveLength(8);
    expect(body.shareUrl).toContain("/r/");
  });

  it("returns existing code idempotently", async () => {
    seedUser(db, { id: "u1", credits: 5 });
    // First call creates
    const r1 = await handleReferralGenerateCode(makeRequest());
    const b1 = (await r1.json()) as { code: string };
    // Second call returns same
    const r2 = await handleReferralGenerateCode(makeRequest());
    const b2 = (await r2.json()) as { code: string };
    expect(b1.code).toBe(b2.code);
  });

  it("uses correct origin in shareUrl", async () => {
    seedUser(db, { id: "u1", credits: 3 });
    const resp = await handleReferralGenerateCode(
      makeRequest("https://batchlyai.com/api/referral/generate-code"),
    );
    const body = (await resp.json()) as { shareUrl: string };
    expect(body.shareUrl).toMatch(/^https:\/\/batchlyai\.com\/r\//);
  });
});

import { handleShare } from "@/routes/api/share";

describe("handleShare", () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    db = createTestDb();
    applyMigrations(db);
    seedUser(db, { id: "u1", credits: 5 });
    vi.clearAllMocks();
    mocks.mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    (globalThis as Record<string, unknown>).__env__ = { batchlyai_db: db };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as Record<string, unknown>).__env__;
  });

  function makeShareReq(body: Record<string, unknown>): Request {
    return {
      json: () => Promise.resolve(body),
      url: "https://batchlyai.com/api/share",
    } as unknown as Request;
  }

  it("returns 401 when not authenticated", async () => {
    mocks.mockGetSession.mockResolvedValue(null);
    const resp = await handleShare(makeShareReq({}));
    expect(resp.status).toBe(401);
  });

  it("returns 400 when required fields are missing", async () => {
    const resp = await handleShare(makeShareReq({ promptTemplate: "test" }));
    expect(resp.status).toBe(400);
  });

  it("returns 200 with shareId and shareUrl on valid submission", async () => {
    const resp = await handleShare(
      makeShareReq({
        promptTemplate: "A {{cat}}",
        variableGroups: [{ values: ["cat"] }],
        resultImageUrls: ["https://example.com/img.png"],
      }),
    );
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { shareId: string; shareUrl: string };
    expect(body.shareId).toMatch(/^share_/);
    expect(body.shareUrl).toContain("/g/");
  });

  it("accepts optional model and aspectRatio", async () => {
    const resp = await handleShare(
      makeShareReq({
        promptTemplate: "A sunset",
        variableGroups: [],
        resultImageUrls: ["https://img1.png"],
        model: "z-image-fast",
        aspectRatio: "16:9",
      }),
    );
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { shareId: string };
    expect(body.shareId).toMatch(/^share_/);
  });
});
