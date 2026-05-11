import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockMirrorImageToR2 = vi.fn((url: string, key: string) =>
    Promise.resolve(`/api/generation-files/${key}`),
  );
  return { mockGetSession, mockMirrorImageToR2 };
});

vi.mock("@/lib/auth/auth", () => ({
  createAuth: () => ({
    api: { getSession: mocks.mockGetSession },
  }),
}));

vi.mock("@/lib/cloudflare/r2", () => ({
  mirrorImageToR2: mocks.mockMirrorImageToR2,
}));

vi.mock("@/lib/db", () => ({
  getDb: (binding: unknown) => binding,
}));

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
    mocks.mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    (globalThis as Record<string, unknown>).__env__ = { batchlyai_db: db };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as Record<string, unknown>).__env__;
  });

  it("mirrors work images to public R2 paths before saving", async () => {
    const resp = await handlePostWork(
      makeJsonRequest("https://batchlyai.com/api/works", {
        title: "Test Work",
        coverUrl: "https://temp.example.com/cover.png",
        resultUrls: ["https://temp.example.com/cover.png", "https://temp.example.com/extra.png"],
        promptTemplate: "A {{cat}}",
        variableGroups: "[]",
        model: "z-image-fast",
      }),
    );

    expect(resp.status).toBe(201);
    expect(mocks.mockMirrorImageToR2).toHaveBeenCalledTimes(2);
    expect(db.__state.insertedWork?.coverUrl).toContain("/api/generation-files/works/");
    expect(String(db.__state.insertedWork?.resultUrls)).toContain("/api/generation-files/works/");
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
});
