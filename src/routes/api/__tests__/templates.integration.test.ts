import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  mockCreateAuth: vi.fn(),
  mockGetSession: vi.fn(),
  mockGenerateExploreMetadata: vi.fn(),
  mockAssertImageUrlsSafe: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/auth/auth", () => ({
  createAuth: mocks.mockCreateAuth,
}));

vi.mock("@/lib/db", () => ({
  getDb: (binding: unknown) => binding,
}));

vi.mock("@/lib/cloudflare/bindings", () => ({
  getD1Binding: () => ((globalThis as any).__env__?.batchlyai_db as any) ?? undefined,
}));

vi.mock("@/lib/explore-metadata", () => ({
  generateExploreMetadata: mocks.mockGenerateExploreMetadata,
}));

vi.mock("@/lib/ai/nsfw", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/nsfw")>();
  return {
    ...actual,
    assertImageUrlsSafe: mocks.mockAssertImageUrlsSafe,
  };
});

import { CONTENT_SAFETY_BLOCK_MESSAGE } from "@/lib/ai/nsfw";
import { handlePostTemplate } from "@/routes/api/templates";

function makePostReq(body: Record<string, unknown>): Request {
  return {
    json: () => Promise.resolve(body),
    url: "https://batchlyai.com/api/templates",
    headers: new Headers(),
  } as unknown as Request;
}

function makeMockDb(existingSlugs: string[] = []) {
  let insertedTemplate: Record<string, unknown> | null = null;
  let selectCount = 0;

  return {
    select: () => ({
      from: () => ({
        where: () => {
          const hasExisting = selectCount < existingSlugs.length;
          selectCount++;
          return Promise.resolve(hasExisting ? [{ id: existingSlugs[selectCount - 1] }] : []);
        },
      }),
    }),
    insert: () => ({
      values: (row: Record<string, unknown>) => {
        insertedTemplate = row;
        return Promise.resolve();
      },
    }),
    __state: {
      get insertedTemplate() {
        return insertedTemplate;
      },
    },
  };
}

describe("handlePostTemplate", () => {
  let db: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    db = makeMockDb();
    vi.clearAllMocks();
    mocks.mockAssertImageUrlsSafe.mockResolvedValue(undefined);
    mocks.mockCreateAuth.mockReturnValue({ api: { getSession: mocks.mockGetSession } });
    mocks.mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    mocks.mockGenerateExploreMetadata.mockResolvedValue({
      name: "Skincare Shelf Scene",
      description: "Use this for skincare product pages and launch campaigns.",
      category: "ecommerce",
      previewImageUrl: "/api/generation-files/works/work-1/0.png",
    });
    (globalThis as Record<string, unknown>).__env__ = { batchlyai_db: db };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as Record<string, unknown>).__env__;
  });

  it("auto-fills template metadata and keeps the preview image", async () => {
    const resp = await handlePostTemplate(
      makePostReq({
        promptTemplate: "A {{skincare, perfume}} product photo on marble",
        variableGroups: [{ id: "var_0", values: ["skincare", "perfume"] }],
        model: "z-image-pro",
        aspectRatio: "9:16",
        coverUrl: "/api/generation-files/works/work-1/0.png",
        resultUrls: ["/api/generation-files/works/work-1/0.png"],
      }),
    );

    expect(resp.status).toBe(201);
    expect(mocks.mockGenerateExploreMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "A {{skincare, perfume}} product photo on marble",
        model: "z-image-pro",
        aspectRatio: "9:16",
      }),
    );

    const body = (await resp.json()) as {
      id: string;
      slug: string;
      url: string;
      previewImageUrl: string | null;
    };
    expect(body.slug).toBe("skincare-shelf-scene");
    expect(body.previewImageUrl).toBe("/api/generation-files/works/work-1/0.png");

    expect(db.__state.insertedTemplate).toMatchObject({
      name: "Skincare Shelf Scene",
      description: "Use this for skincare product pages and launch campaigns.",
      category: "ecommerce",
      previewImageUrl: "/api/generation-files/works/work-1/0.png",
      slug: "skincare-shelf-scene",
    });
  });

  it("requires an authenticated user", async () => {
    mocks.mockGetSession.mockResolvedValue(null);

    const resp = await handlePostTemplate(
      makePostReq({
        promptTemplate: "A {{product}} photo",
        variableGroups: [{ id: "var_0", values: ["product"] }],
      }),
    );

    expect(resp.status).toBe(401);
    await expect(resp.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns 501 when auth or DB is unavailable", async () => {
    mocks.mockCreateAuth.mockReturnValueOnce(null);

    const resp = await handlePostTemplate(
      makePostReq({
        promptTemplate: "A {{product}} photo",
        variableGroups: [{ id: "var_0", values: ["product"] }],
      }),
    );

    expect(resp.status).toBe(501);
  });

  it.each([
    [
      "missing required fields",
      {},
      { error: "Missing required fields: promptTemplate, variableGroups" },
    ],
    [
      "too long prompt",
      { promptTemplate: `${"x".repeat(5001)} {{product}}`, variableGroups: [] },
      { error: "Prompt template too long" },
    ],
    [
      "too long name",
      { name: "x".repeat(121), promptTemplate: "A {{product}}", variableGroups: [] },
      { error: "Name too long" },
    ],
    [
      "too long description",
      { description: "x".repeat(501), promptTemplate: "A {{product}}", variableGroups: [] },
      { error: "Description too long" },
    ],
    [
      "too large variable groups",
      { promptTemplate: "A {{product}}", variableGroups: "x".repeat(20_001) },
      { error: "Variable groups too large" },
    ],
    [
      "too many result URLs",
      { promptTemplate: "A {{product}}", variableGroups: [], resultUrls: Array(21).fill("x") },
      { error: "Too many result URLs" },
    ],
    [
      "no variable marker",
      { promptTemplate: "A product photo", variableGroups: [] },
      { error: "Prompt template must contain at least one {{variable}} marker" },
    ],
  ])("validates %s", async (_name, body, expected) => {
    const resp = await handlePostTemplate(makePostReq(body));

    expect(resp.status).toBe(400);
    await expect(resp.json()).resolves.toEqual(expected);
  });

  it("generates a unique slug when metadata name collides", async () => {
    db = makeMockDb(["existing-template"]);
    (globalThis as Record<string, unknown>).__env__ = { batchlyai_db: db };

    const resp = await handlePostTemplate(
      makePostReq({
        promptTemplate: "A {{product}} photo",
        variableGroups: JSON.stringify([{ id: "var_0", values: ["product"] }]),
      }),
    );
    const body = (await resp.json()) as { slug: string };

    expect(resp.status).toBe(201);
    expect(body.slug).toBe("skincare-shelf-scene-1");
    expect(db.__state.insertedTemplate?.variableGroups).toBe(
      JSON.stringify([{ id: "var_0", values: ["product"] }]),
    );
  });

  it("rejects templates with unsafe preview or result images", async () => {
    mocks.mockAssertImageUrlsSafe.mockRejectedValue(new Error(CONTENT_SAFETY_BLOCK_MESSAGE));

    const resp = await handlePostTemplate(
      makePostReq({
        promptTemplate: "A {{product}} photo",
        variableGroups: [{ id: "var_0", values: ["product"] }],
        coverUrl: "https://temp.example.com/unsafe.png",
        resultUrls: ["https://temp.example.com/unsafe.png"],
      }),
    );

    expect(resp.status).toBe(400);
    await expect(resp.json()).resolves.toEqual({ error: CONTENT_SAFETY_BLOCK_MESSAGE });
    expect(mocks.mockGenerateExploreMetadata).not.toHaveBeenCalled();
    expect(db.__state.insertedTemplate).toBeNull();
  });
});
