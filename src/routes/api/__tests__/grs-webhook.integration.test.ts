import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/env/server", () => ({
  env: { GRS_WEBHOOK_SECRET: "test-secret" },
}));

import { handleGrsWebhook } from "@/routes/api/grs-webhook";

function makeRequest(overrides?: { body?: Record<string, unknown>; url?: string }): Request {
  return {
    json: () => Promise.resolve(overrides?.body ?? {}),
    url: overrides?.url ?? "https://batchlyai.com/api/grs-webhook?secret=test-secret",
  } as unknown as Request;
}

describe("handleGrsWebhook", () => {
  let mockKv: { get: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockKv = {
      get: vi.fn(),
      put: vi.fn().mockResolvedValue(undefined),
    };
    (globalThis as Record<string, unknown>).__env__ = { batchlyai_kv: mockKv };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as Record<string, unknown>).__env__;
  });

  it("returns 401 when secret is missing or wrong", async () => {
    const resp = await handleGrsWebhook(
      makeRequest({ url: "https://batchlyai.com/api/grs-webhook?secret=wrong" }),
    );
    expect(resp.status).toBe(401);
  });

  it("returns 400 when id is missing from body", async () => {
    const resp = await handleGrsWebhook(makeRequest({ body: {} }));
    expect(resp.status).toBe(400);
    const body = (await resp.json()) as { error: string };
    expect(body.error).toBe("Missing task id");
  });

  it("returns 404 when KV entry does not exist", async () => {
    mockKv.get.mockResolvedValue(null);
    const resp = await handleGrsWebhook(
      makeRequest({ body: { id: "grs-nonexistent", status: "succeeded" } }),
    );
    expect(resp.status).toBe(404);
  });

  it("updates KV with succeeded status and image URLs", async () => {
    mockKv.get.mockResolvedValue(
      JSON.stringify({
        userId: "u1",
        status: "processing",
        prompt: "a cat in forest",
        createdAt: Date.now(),
      }),
    );

    const resp = await handleGrsWebhook(
      makeRequest({
        body: {
          id: "grs-task-001",
          status: "succeeded",
          results: [
            { url: "https://grs-cdn.com/output/cat-forest-1.png" },
            { url: "https://grs-cdn.com/output/cat-forest-2.png" },
          ],
        },
      }),
    );
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { received: boolean };
    expect(body.received).toBe(true);

    // Verify KV was updated with URLs
    expect(mockKv.put).toHaveBeenCalled();
    const putValue = JSON.parse(mockKv.put.mock.calls[0][1] as string);
    expect(putValue.status).toBe("succeeded");
    expect(putValue.urls).toEqual([
      "https://grs-cdn.com/output/cat-forest-1.png",
      "https://grs-cdn.com/output/cat-forest-2.png",
    ]);
  });

  it("updates KV with failed status and error message", async () => {
    mockKv.get.mockResolvedValue(
      JSON.stringify({
        userId: "u1",
        status: "processing",
        prompt: "something inappropriate",
        createdAt: Date.now(),
      }),
    );

    const resp = await handleGrsWebhook(
      makeRequest({
        body: {
          id: "grs-task-002",
          status: "failed",
          error: "NSFW content filtered",
        },
      }),
    );
    expect(resp.status).toBe(200);

    const putValue = JSON.parse(mockKv.put.mock.calls[0][1] as string);
    expect(putValue.status).toBe("failed");
    expect(putValue.error).toBe("NSFW content filtered");
  });

  it("preserves userId and prompt in updated KV entry", async () => {
    const originalTask = {
      userId: "user-abc-123",
      status: "processing",
      prompt: "beautiful sunset over ocean",
      aspectRatio: "16:9",
      createdAt: 1700000000000,
    };
    mockKv.get.mockResolvedValue(JSON.stringify(originalTask));

    await handleGrsWebhook(
      makeRequest({
        body: {
          id: "grs-task-003",
          status: "succeeded",
          results: [{ url: "https://grs-cdn.com/sunset.png" }],
        },
      }),
    );

    const putValue = JSON.parse(mockKv.put.mock.calls[0][1] as string);
    expect(putValue.userId).toBe("user-abc-123");
    expect(putValue.prompt).toBe("beautiful sunset over ocean");
    expect(putValue.status).toBe("succeeded");
    expect(putValue.urls).toEqual(["https://grs-cdn.com/sunset.png"]);
  });

  it("stores correct KV key format for frontend polling to find", async () => {
    mockKv.get.mockResolvedValue(
      JSON.stringify({ userId: "u1", status: "processing", prompt: "test", createdAt: 1 }),
    );

    await handleGrsWebhook(
      makeRequest({
        body: {
          id: "grs-task-kv-key",
          status: "succeeded",
          results: [{ url: "https://example.com/img.png" }],
        },
      }),
    );

    // Verify KV was written with the correct grs: prefix key
    expect(mockKv.put).toHaveBeenCalledWith("grs:grs-task-kv-key", expect.any(String), {
      expirationTtl: 3600,
    });
  });
});
