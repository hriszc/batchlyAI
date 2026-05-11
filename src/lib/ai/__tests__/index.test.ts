import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mockFetch = vi.fn();

vi.stubGlobal("fetch", mockFetch);

vi.mock("@/env/server", () => ({
  env: {
    GRSAI_API_KEY: "test-grs-key",
    REPLICATE_API_KEY: "test-rep-key",
    DEEPSEEK_API_KEY: "test-ds-key",
    VITE_BASE_URL: "https://batchlyai.com",
  },
}));

import {
  createGrsaiPredictions,
  createReplicatePredictions,
  pollReplicatePrediction,
  generateText,
  runExpandLLM,
} from "@/lib/ai";

describe("createGrsaiPredictions", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends correct request to GRS AI API", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ code: 0, data: { id: "grs-001" }, msg: "ok" }),
    });

    const results = await createGrsaiPredictions({ prompt: "a cat", aspectRatio: "16:9", n: 2 });
    expect(results).toEqual([
      { id: "grs-001", status: "processing" },
      { id: "grs-001", status: "processing" },
    ]);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("throws on GRS API error (non-ok response)", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve("server error"),
    });
    await expect(createGrsaiPredictions({ prompt: "test" })).rejects.toThrow("grsai API error 500");
  });

  it("throws on GRS API unexpected response format", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ code: 1, data: null, msg: "bad" }),
    });
    await expect(createGrsaiPredictions({ prompt: "test" })).rejects.toThrow(
      "grsai API unexpected response",
    );
  });

  it("includes webhook URL in the request body", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ code: 0, data: { id: "grs-w" }, msg: "ok" }),
    });
    await createGrsaiPredictions({ prompt: "test" });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.webHook).toBe("https://batchlyai.com/api/grs-webhook");
    expect(body.model).toBe("gpt-image-2");
  });

  it("passes reference image URLs when provided", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ code: 0, data: { id: "grs-ref" }, msg: "ok" }),
    });
    await createGrsaiPredictions({
      prompt: "enhance this image",
      urls: ["https://r2.example.com/uploads/ref.png"],
    });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.urls).toEqual(["https://r2.example.com/uploads/ref.png"]);
  });

  it("sends empty urls array when not provided", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ code: 0, data: { id: "grs-def" }, msg: "ok" }),
    });
    await createGrsaiPredictions({ prompt: "test" });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.urls).toEqual([]);
  });

  it("returns urls synchronously when progress=100 and status=succeeded", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          code: 0,
          data: {
            id: "grs-sync",
            progress: 100,
            status: "succeeded",
            results: [
              { url: "https://aigate.com/output/img1.png" },
              { url: "https://aigate.com/output/img2.png" },
            ],
          },
          msg: "success",
        }),
    });
    const results = await createGrsaiPredictions({ prompt: "test" });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("grs-sync");
    expect(results[0].status).toBe("succeeded");
    expect(results[0].urls).toEqual([
      "https://aigate.com/output/img1.png",
      "https://aigate.com/output/img2.png",
    ]);
  });

  it("returns async when progress < 100 even with results present", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          code: 0,
          data: {
            id: "grs-not-ready",
            progress: 50,
            status: "succeeded",
            results: [{ url: "https://aigate.com/output/partial.png" }],
          },
          msg: "success",
        }),
    });
    const results = await createGrsaiPredictions({ prompt: "test" });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("grs-not-ready");
    expect(results[0].status).toBe("processing");
    expect(results[0].urls).toBeUndefined();
  });

  it("returns async status when AIGATE returns only id", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          code: 0,
          data: { id: "grs-async" },
          msg: "success",
        }),
    });
    const results = await createGrsaiPredictions({ prompt: "test" });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("grs-async");
    expect(results[0].status).toBe("processing");
    expect(results[0].urls).toBeUndefined();
  });
});

describe("createReplicatePredictions", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends prediction request with correct version", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ id: "rep-001", status: "starting", urls: { get: "u", cancel: "c" } }),
    });
    const results = await createReplicatePredictions({
      prompt: "forest",
      model: "z-image-fast",
      n: 1,
    });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("rep-001");
  });

  it("switches z-image-fast to img2img when a reference image is provided", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ id: "rep-img2img", status: "starting", urls: { get: "u", cancel: "c" } }),
    });

    await createReplicatePredictions({
      prompt: "edit this image",
      model: "z-image-fast",
      urls: ["https://r2.example.com/uploads/ref.png"],
      n: 1,
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.version).toBe("5c958e90e0f904240629ee35c69196e3bd790b5528c0696705ebdb1656871dd8");
    expect(body.input.image).toBe("https://r2.example.com/uploads/ref.png");
  });

  it("calculates dimensions for aspect ratio 16:9", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ id: "r1", status: "starting", urls: { get: "g", cancel: "c" } }),
    });
    await createReplicatePredictions({ prompt: "test", aspectRatio: "16:9", n: 1 });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.input.width).toBe(1024);
    expect(body.input.height).toBe(576);
  });

  it("calculates portrait dimensions for 9:16", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ id: "r2", status: "starting", urls: { get: "g", cancel: "c" } }),
    });
    await createReplicatePredictions({ prompt: "portrait", aspectRatio: "9:16", n: 1 });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.input.width).toBe(576);
    expect(body.input.height).toBe(1024);
  });

  it("defaults to z-image-fast version when model not found", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ id: "r3", status: "starting", urls: { get: "g", cancel: "c" } }),
    });
    await createReplicatePredictions({ prompt: "test", model: "unknown-model", n: 1 });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.version).toBe("cba7f388939b0db49dbea3341f8d732577aa0a964d9eefea5d186ab47e60deba");
  });

  it("throws on Replicate API error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 422,
      text: () => Promise.resolve("bad prompt"),
    });
    await expect(createReplicatePredictions({ prompt: "", n: 1 })).rejects.toThrow(
      "Replicate API error 422",
    );
  });

  it("passes reference images to video generations", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ id: "video-ref", status: "starting", urls: { get: "u", cancel: "c" } }),
    });

    await createReplicatePredictions({
      prompt: "make a video",
      model: "z-video-fast",
      urls: ["https://r2.example.com/uploads/video-ref.png"],
      n: 1,
      duration: 5,
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.input.image).toBe("https://r2.example.com/uploads/video-ref.png");
    expect(body.input.duration).toBe(5);
  });
});

describe("pollReplicatePrediction", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns succeeded with urls", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ id: "p1", status: "succeeded", output: ["https://img.png"], urls: {} }),
    });
    const result = await pollReplicatePrediction("p1");
    expect(result.status).toBe("succeeded");
    expect(result.urls).toEqual(["https://img.png"]);
  });

  it("returns failed with error", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "p2", status: "failed", error: "NSFW", urls: {} }),
    });
    const result = await pollReplicatePrediction("p2");
    expect(result.status).toBe("failed");
    expect(result.error).toBe("NSFW");
  });

  it("returns processing for in-progress predictions", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "p3", status: "processing", urls: {} }),
    });
    const result = await pollReplicatePrediction("p3");
    expect(result.status).toBe("processing");
    expect(result.urls).toBeNull();
  });

  it("throws on HTTP error", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });
    await expect(pollReplicatePrediction("bad")).rejects.toThrow("Replicate poll error 404");
  });
});

describe("generateText", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns generated text content", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: "Hello world" }, finish_reason: "stop" }],
        }),
    });
    const text = await generateText({ prompt: "Say hello" });
    expect(text).toBe("Hello world");
  });

  it("uses default model when not specified", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ choices: [{ message: { content: "ok" }, finish_reason: "stop" }] }),
    });
    await generateText({ prompt: "test" });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe("deepseek-v4-flash");
  });
});

describe("runExpandLLM", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("splits comma-separated response into array", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: " red, blue , green " }, finish_reason: "stop" }],
        }),
    });
    const values = await runExpandLLM("colors");
    expect(values).toEqual(["red", "blue", "green"]);
  });

  it("filters empty values", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: "cat, , dog, " }, finish_reason: "stop" }],
        }),
    });
    const values = await runExpandLLM("animals");
    expect(values).toEqual(["cat", "dog"]);
  });
});

// --- fetchWithFallback: gateway error → direct API ---
describe("fetchWithFallback (internal)", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("falls back to direct API when gateway returns non-ok", async () => {
    // First call (gateway) fails with 500, second call (direct) succeeds
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve("gateway error"),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ code: 0, data: { id: "grs-direct" }, msg: "ok" }),
      });

    const results = await createGrsaiPredictions({ prompt: "test", n: 1 });
    expect(results[0].id).toBe("grs-direct");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("falls back to direct API when gateway fetch throws", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network error")).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ code: 0, data: { id: "grs-direct2" }, msg: "ok" }),
    });

    const results = await createGrsaiPredictions({ prompt: "test", n: 1 });
    expect(results[0].id).toBe("grs-direct2");
  });
});

// --- fetchWithRetry: 429 retry ---
describe("fetchWithRetry (internal)", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("succeeds when first call is 429 and retry succeeds", async () => {
    // 429 on gateway → fallback to direct → 429 on direct → retry → success on gateway
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: () => Promise.resolve("rate limited"),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ id: "retry-win", status: "starting", urls: { get: "g", cancel: "c" } }),
      });

    const results = await createReplicatePredictions({
      prompt: "test",
      model: "z-image-fast",
      n: 1,
    });
    expect(results[0].id).toBe("retry-win");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
