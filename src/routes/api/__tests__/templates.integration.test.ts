import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGenerateExploreMetadata: vi.fn(),
}));

vi.mock("@/lib/auth/auth", () => ({
  createAuth: () => ({ api: { getSession: mocks.mockGetSession } }),
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

import { handlePostTemplate } from "@/routes/api/templates";

function makePostReq(body: Record<string, unknown>): Request {
  return {
    json: () => Promise.resolve(body),
    url: "https://batchlyai.com/api/templates",
    headers: new Headers(),
  } as unknown as Request;
}

function makeMockDb() {
  let insertedTemplate: Record<string, unknown> | null = null;

  return {
    select: () => ({
      from: () => ({
        where: () => Promise.resolve([]),
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
});
