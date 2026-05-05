import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockPollReplicate = vi.fn();
  return { mockGetSession, mockPollReplicate };
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
});
