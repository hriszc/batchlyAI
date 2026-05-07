import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mockR2Put = vi.fn();

vi.mock("@/lib/cloudflare/r2", async () => {
  const actual = await vi.importActual<typeof import("@/lib/cloudflare/r2")>("@/lib/cloudflare/r2");
  // We test the actual functions but mock the binding
  return actual;
});

import { uploadToR2, getR2PublicUrl } from "@/lib/cloudflare/r2";

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

  it("returns key when R2 endpoint not configured", () => {
    const url = getR2PublicUrl("uploads/u1/file.png");
    expect(url).toBe("uploads/u1/file.png");
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
