import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockReplicate = vi.fn();
  return { mockGetSession, mockReplicate };
});

vi.mock("@/lib/auth/auth", () => ({
  createAuth: () => ({
    api: { getSession: mocks.mockGetSession },
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: () => ({ allowed: true, remaining: 59, resetAt: Date.now() + 60000 }),
}));

vi.mock("@/lib/db", () => ({
  getDb: (b: any) => b,
}));

const mockKv = {
  get: vi.fn().mockResolvedValue(null),
  put: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@/lib/cloudflare/bindings", () => ({
  getKvBinding: () => mockKv,
  getD1Binding: () => undefined,
}));

vi.mock("@/lib/ai", () => ({
  createReplicatePredictions: mocks.mockReplicate,
  createGrsaiPredictions: vi.fn(),
  generateText: vi.fn(),
}));

import { Route } from "@/routes/api/generate";

function makeRequest(body: Record<string, unknown>): Request {
  return {
    json: () => Promise.resolve(body),
    headers: new Headers({ "CF-Connecting-IP": "1.2.3.4" }),
  } as unknown as Request;
}

describe("generate route guest path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockGetSession.mockResolvedValue(null);
    mockKv.get.mockResolvedValue(null);
    mockKv.put.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("forwards attached urls to image turbo guest generation", async () => {
    mocks.mockReplicate.mockResolvedValue([{ id: "guest-pred-1", status: "processing" }]);

    const post = (Route.options.server?.handlers as any).POST as (args: any) => Promise<Response>;
    const resp = await post({
      request: makeRequest({
        prompt: "guest test",
        model: "z-image-fast",
        guestToken: "guest-001",
        attachedUrls: ["https://r2.example.com/uploads/guest-ref.png"],
      }),
      params: {},
      context: {} as never,
    } as any);

    expect(resp.status).toBe(200);
    expect(mocks.mockReplicate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "z-image-fast",
        urls: ["https://r2.example.com/uploads/guest-ref.png"],
      }),
    );
  });
});
