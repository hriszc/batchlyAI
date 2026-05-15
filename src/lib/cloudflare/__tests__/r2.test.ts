import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/cloudflare/r2", async () => {
  const actual = await vi.importActual<typeof import("@/lib/cloudflare/r2")>("@/lib/cloudflare/r2");
  // We test the actual functions but mock the binding
  return actual;
});

import { getR2PublicUrl, mirrorImageToR2, uploadToR2 } from "@/lib/cloudflare/r2";

describe("uploadToR2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (globalThis as Record<string, unknown>).__env__;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns success false when R2 binding is not configured", async () => {
    const result = await uploadToR2("test-key", new ArrayBuffer(10));
    expect(result.success).toBe(false);
    expect(result.publicUrl).toBe("");
  });

  it("calls r2.put with correct key and body", async () => {
    const mockPut = vi.fn().mockResolvedValue(undefined);
    (globalThis as Record<string, unknown>).__env__ = { batchlyai_r2: { put: mockPut } };

    const buffer = new ArrayBuffer(100);
    const result = await uploadToR2("uploads/u1/photo.png", buffer);
    expect(result.success).toBe(true);
    expect(mockPut).toHaveBeenCalledWith("uploads/u1/photo.png", buffer);
  });
});

describe("getR2PublicUrl", () => {
  afterEach(() => {
    delete (globalThis as Record<string, unknown>).__env__;
  });

  it("returns proxy URL when R2 endpoint not configured", () => {
    const url = getR2PublicUrl("uploads/u1/file.png");
    expect(url).toBe("/api/generation-files/uploads/u1/file.png");
  });

  it("returns full URL when R2 endpoint and bucket configured", () => {
    (globalThis as Record<string, unknown>).__env__ = {
      R2_ENDPOINT: "https://cdn.example.com",
      R2_BUCKET: "my-bucket",
    };
    const url = getR2PublicUrl("uploads/u1/file.png");
    expect(url).toBe("https://cdn.example.com/my-bucket/uploads/u1/file.png");
  });
});

describe("mirrorImageToR2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (globalThis as Record<string, unknown>).__env__;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as Record<string, unknown>).__env__;
  });

  it("keeps the original URL when R2 binding is missing", async () => {
    const result = await mirrorImageToR2("https://replicate.delivery/prediction/out.png", "k.png");

    expect(result).toBe("https://replicate.delivery/prediction/out.png");
  });

  it("blocks invalid mirror URLs before fetching", async () => {
    const put = vi.fn();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    (globalThis as Record<string, unknown>).__env__ = { batchlyai_r2: { put } };

    await expect(mirrorImageToR2("http://replicate.delivery/out.png", "k.png")).resolves.toBe(
      "http://replicate.delivery/out.png",
    );
    await expect(mirrorImageToR2("https://evil.example/out.png", "k.png")).resolves.toBe(
      "https://evil.example/out.png",
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });

  it("mirrors allowed external images with content metadata", async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { "Content-Type": "image/webp", "Content-Length": "3" },
        }),
      ),
    );
    (globalThis as Record<string, unknown>).__env__ = {
      batchlyai_r2: { put },
      R2_ENDPOINT: "https://cdn.example.com",
      R2_BUCKET: "bucket",
    };

    const result = await mirrorImageToR2("https://replicate.delivery/out.webp", "mirrors/out.webp");

    expect(result).toBe("https://cdn.example.com/bucket/mirrors/out.webp");
    expect(put).toHaveBeenCalledWith("mirrors/out.webp", expect.any(ArrayBuffer), {
      httpMetadata: { contentType: "image/webp" },
    });
  });

  it("keeps original URL when external response is not mirrorable", async () => {
    const put = vi.fn();
    (globalThis as Record<string, unknown>).__env__ = { batchlyai_r2: { put } };

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 500 })));
    await expect(mirrorImageToR2("https://replicate.delivery/fail.png", "k.png")).resolves.toBe(
      "https://replicate.delivery/fail.png",
    );

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("html", {
          status: 200,
          headers: { "Content-Type": "text/html", "Content-Length": "4" },
        }),
      ),
    );
    await expect(mirrorImageToR2("https://replicate.delivery/page", "k.png")).resolves.toBe(
      "https://replicate.delivery/page",
    );

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("large", {
          status: 200,
          headers: { "Content-Type": "image/png", "Content-Length": "20000000" },
        }),
      ),
    );
    await expect(mirrorImageToR2("https://replicate.delivery/large.png", "k.png")).resolves.toBe(
      "https://replicate.delivery/large.png",
    );

    expect(put).not.toHaveBeenCalled();
  });

  it("copies existing local generation files through R2", async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    const get = vi.fn().mockResolvedValue({
      arrayBuffer: vi.fn().mockResolvedValue(new Uint8Array([4, 5]).buffer),
      body: new ReadableStream(),
      httpMetadata: { contentType: "image/png" },
    });
    (globalThis as Record<string, unknown>).__env__ = {
      batchlyai_r2: { get, put },
      R2_ENDPOINT: "https://cdn.example.com",
      R2_BUCKET: "bucket",
    };

    const result = await mirrorImageToR2(
      "/api/generation-files/generations/u1/g1/0.png",
      "works/w1/0.png",
    );

    expect(result).toBe("https://cdn.example.com/bucket/works/w1/0.png");
    expect(get).toHaveBeenCalledWith("generations/u1/g1/0.png");
    expect(put).toHaveBeenCalledWith("works/w1/0.png", expect.any(ArrayBuffer), {
      httpMetadata: { contentType: "image/png" },
    });
  });

  it("keeps local file URL when local object is missing or blocked", async () => {
    const imageUrl = "/api/generation-files/generations/u1/g1/0.png";
    const put = vi.fn();
    const get = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        body: new ReadableStream(),
        httpMetadata: { contentType: "text/html" },
      });
    (globalThis as Record<string, unknown>).__env__ = { batchlyai_r2: { get, put } };

    await expect(mirrorImageToR2(imageUrl, "works/w1/0.png")).resolves.toBe(imageUrl);
    await expect(mirrorImageToR2(imageUrl, "works/w1/0.png")).resolves.toBe(imageUrl);

    expect(put).not.toHaveBeenCalled();
  });
});
