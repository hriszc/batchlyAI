import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockMirrorImageToR2 = vi.fn((url: string, key: string) =>
    Promise.resolve(`/api/generation-files/${key}`),
  );
  const mockGenerateExploreMetadata = vi.fn();
  const mockAssertImageUrlsSafe = vi.fn(() => Promise.resolve());
  return {
    mockGetSession,
    mockMirrorImageToR2,
    mockGenerateExploreMetadata,
    mockAssertImageUrlsSafe,
  };
});

vi.mock("@/lib/auth/auth", () => ({
  createAuth: () => ({
    api: { getSession: mocks.mockGetSession },
  }),
}));

vi.mock("@/lib/cloudflare/r2", () => ({
  mirrorImageToR2: mocks.mockMirrorImageToR2,
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

vi.mock("@/lib/db", () => ({
  getDb: (binding: unknown) => binding,
}));

import { CONTENT_SAFETY_BLOCK_MESSAGE } from "@/lib/ai/nsfw";
import { handleGenerationFile } from "@/routes/api/generation-files/$";
import { handlePostWork } from "@/routes/api/works";

function makeJsonRequest(url: string, body: Record<string, unknown>): Request {
  return {
    url,
    json: () => Promise.resolve(body),
    headers: new Headers(),
  } as unknown as Request;
}

function makeMockDb() {
  let insertedWork: Record<string, unknown> | null = null;
  let publishedWork: Record<string, unknown> | null = null;

  return {
    insert: () => ({
      values: (row: Record<string, unknown>) => {
        insertedWork = row;
        publishedWork = row;
        return Promise.resolve();
      },
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve(publishedWork ? [publishedWork] : []),
        }),
      }),
    }),
    __state: {
      get insertedWork() {
        return insertedWork;
      },
      set publishedWork(row: Record<string, unknown> | null) {
        publishedWork = row;
      },
    },
  };
}

describe("handlePostWork", () => {
  let db: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    db = makeMockDb();
    vi.clearAllMocks();
    mocks.mockAssertImageUrlsSafe.mockResolvedValue(undefined);
    mocks.mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    mocks.mockGenerateExploreMetadata.mockResolvedValue({
      name: "Studio Product Shot",
      description: "Use this studio product shot for product pages and campaigns.",
      useCase:
        "This studio product shot helps ecommerce teams create product-page visuals and campaign creatives from one click.",
      category: "ecommerce",
      previewImageUrl: "/api/generation-files/works/test-work/0.png",
    });
    (globalThis as Record<string, unknown>).__env__ = { batchlyai_db: db };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as Record<string, unknown>).__env__;
  });

  it("mirrors work images to public R2 paths before saving", async () => {
    const resp = await handlePostWork(
      makeJsonRequest("https://batchlyai.com/api/works", {
        coverUrl: "https://temp.example.com/cover.png",
        resultUrls: ["https://temp.example.com/cover.png", "https://temp.example.com/extra.png"],
        promptTemplate: "A {{cat}}",
        originalPromptTemplate: "A {*pet*}",
        variableGroups: "[]",
        model: "z-image-fast",
        aspectRatio: "9:16",
      }),
    );

    expect(resp.status).toBe(201);
    expect(mocks.mockMirrorImageToR2).toHaveBeenCalledTimes(2);
    expect(mocks.mockGenerateExploreMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "A {*pet*}",
        model: "z-image-fast",
        aspectRatio: "9:16",
      }),
    );
    expect(db.__state.insertedWork?.originalPromptTemplate).toBe("A {*pet*}");
    expect(db.__state.insertedWork?.title).toBe("Studio Product Shot");
    expect(db.__state.insertedWork?.description).toContain("studio product shot");
    expect(db.__state.insertedWork?.useCase).toContain("ecommerce teams");
    expect(db.__state.insertedWork?.category).toBe("ecommerce");
    expect(db.__state.insertedWork?.coverUrl).toContain("/api/generation-files/works/");
    expect(String(db.__state.insertedWork?.resultUrls)).toContain("/api/generation-files/works/");
    const body = (await resp.json()) as {
      coverUrl: string;
      resultUrls: string[];
      title: string;
      description: string;
      useCase: string;
      category: string;
    };
    expect(body.title).toBe("Studio Product Shot");
    expect(body.useCase).toContain("ecommerce teams");
    expect(body.coverUrl).toContain("/api/generation-files/works/");
    expect(body.resultUrls).toHaveLength(2);
  });

  it("rejects publishing unsafe work images", async () => {
    mocks.mockAssertImageUrlsSafe.mockRejectedValue(new Error(CONTENT_SAFETY_BLOCK_MESSAGE));

    const resp = await handlePostWork(
      makeJsonRequest("https://batchlyai.com/api/works", {
        coverUrl: "https://temp.example.com/unsafe.png",
        resultUrls: ["https://temp.example.com/unsafe.png"],
        promptTemplate: "A {{cat}}",
        variableGroups: "[]",
        model: "z-image-fast",
      }),
    );

    expect(resp.status).toBe(400);
    await expect(resp.json()).resolves.toEqual({ error: CONTENT_SAFETY_BLOCK_MESSAGE });
    expect(mocks.mockMirrorImageToR2).not.toHaveBeenCalled();
    expect(db.__state.insertedWork).toBeNull();
  });
});

describe("handleGenerationFile", () => {
  let db: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    db = makeMockDb();
    vi.clearAllMocks();
    mocks.mockGetSession.mockResolvedValue(null);
    (globalThis as Record<string, unknown>).__env__ = {
      batchlyai_db: db,
      batchlyai_r2: {
        get: vi.fn().mockResolvedValue({
          body: new ReadableStream(),
          writeHttpMetadata: vi.fn(),
        }),
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as Record<string, unknown>).__env__;
  });

  it("allows anonymous access to published work files", async () => {
    db.__state.publishedWork = {
      id: "work-1",
      userId: "u1",
      title: "Published",
      description: null,
      category: "general",
      promptTemplate: "A {{cat}}",
      variableGroups: "[]",
      coverUrl: "/api/generation-files/works/work-1/0.png",
      resultUrls: JSON.stringify(["/api/generation-files/works/work-1/0.png"]),
      model: "z-image-fast",
      parentWorkId: null,
      isPublished: 1,
      likeCount: 0,
      commentCount: 0,
      remixCount: 0,
      createdAt: Math.floor(Date.now() / 1000),
      publishedAt: Math.floor(Date.now() / 1000),
    };

    const resp = await handleGenerationFile(
      {
        headers: new Headers(),
        url: "https://batchlyai.com/api/generation-files/works/work-1/0.png",
      } as unknown as Request,
      { _splat: "works/work-1/0.png" },
    );

    expect(resp.status).toBe(200);
  });

  it("allows anonymous access to mirrored work files even when DB lookup misses", async () => {
    db.__state.publishedWork = null;

    const resp = await handleGenerationFile(
      {
        headers: new Headers(),
        url: "https://batchlyai.com/api/generation-files/works/work-1/0.png",
      } as unknown as Request,
      { _splat: "works/work-1/0.png" },
    );

    expect(resp.status).toBe(200);
  });

  it("returns 401 for anonymous private generation files", async () => {
    const resp = await handleGenerationFile(
      {
        headers: new Headers(),
        url: "https://batchlyai.com/api/generation-files/generations/u1/gen-1/0.png",
      } as unknown as Request,
      { _splat: "generations/u1/gen-1/0.png" },
    );

    expect(resp.status).toBe(401);
  });

  it("allows anonymous access to generation files referenced by published works", async () => {
    db.__state.publishedWork = {
      id: "work-1",
      userId: "u1",
      title: "Published from generation",
      description: null,
      category: "general",
      promptTemplate: "A {{cat}}",
      variableGroups: "[]",
      coverUrl: "/api/generation-files/generations/u1/gen-1/0.png",
      resultUrls: JSON.stringify(["/api/generation-files/generations/u1/gen-1/0.png"]),
      model: "z-image-fast",
      parentWorkId: null,
      isPublished: 1,
      likeCount: 0,
      commentCount: 0,
      remixCount: 0,
      createdAt: Math.floor(Date.now() / 1000),
      publishedAt: Math.floor(Date.now() / 1000),
    };

    const resp = await handleGenerationFile(
      {
        headers: new Headers(),
        url: "https://batchlyai.com/api/generation-files/generations/u1/gen-1/0.png",
      } as unknown as Request,
      { _splat: "generations/u1/gen-1/0.png" },
    );

    expect(resp.status).toBe(200);
  });

  it("reads generation file keys from Nitro splat params", async () => {
    mocks.mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    const mockGet = vi.fn().mockResolvedValue({
      body: new ReadableStream(),
      writeHttpMetadata: vi.fn(),
    });
    (globalThis as Record<string, unknown>).__env__ = {
      batchlyai_db: db,
      batchlyai_r2: {
        get: mockGet,
      },
    };

    const resp = await handleGenerationFile(
      {
        headers: new Headers(),
        url: "https://batchlyai.com/api/generation-files/generations/u1/gen-1/0.png",
      } as unknown as Request,
      { _: "generations/u1/gen-1/0.png" } as unknown as { _splat: string },
    );

    expect(resp.status).toBe(200);
    expect(mockGet).toHaveBeenCalledWith("generations/u1/gen-1/0.png");
  });
});
