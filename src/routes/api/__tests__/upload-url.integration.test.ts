import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockUploadToR2 = vi.fn();
  return { mockGetSession, mockUploadToR2 };
});

vi.mock("@/lib/auth/auth", () => ({
  createAuth: () => ({
    api: { getSession: mocks.mockGetSession },
  }),
}));

vi.mock("@/lib/cloudflare/r2", () => ({
  uploadToR2: mocks.mockUploadToR2,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: () => ({ allowed: true, remaining: 19, resetAt: Date.now() + 60000 }),
}));

import { handleUpload } from "@/routes/api/upload-url";

function makeRequest(overrides?: {
  buffer?: ArrayBuffer;
  headers?: Record<string, string>;
  url?: string;
}): Request {
  return {
    arrayBuffer: () => Promise.resolve(overrides?.buffer ?? new ArrayBuffer(100)),
    body: new ReadableStream(),
    headers: new Headers(overrides?.headers ?? {}),
    url: overrides?.url ?? "https://batchlyai.com/api/upload-url",
  } as unknown as Request;
}

describe("handleUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockUploadToR2.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mocks.mockGetSession.mockResolvedValue(null);
    const resp = await handleUpload(
      makeRequest({
        headers: { "x-file-name": "test.png", "Content-Type": "image/png" },
      }),
    );
    expect(resp.status).toBe(401);
  });

  it("returns 400 when x-file-name header is missing", async () => {
    mocks.mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    const resp = await handleUpload(
      makeRequest({
        headers: { "Content-Type": "image/png" },
      }),
    );
    expect(resp.status).toBe(400);
  });

  it("returns 400 for disallowed file extension", async () => {
    mocks.mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    const resp = await handleUpload(
      makeRequest({
        headers: { "x-file-name": "script.exe", "Content-Type": "image/png" },
      }),
    );
    expect(resp.status).toBe(400);
    const body = (await resp.json()) as { error: string };
    expect(body.error).toContain("File type not allowed");
  });

  it("returns 400 for disallowed Content-Type", async () => {
    mocks.mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    const resp = await handleUpload(
      makeRequest({
        headers: { "x-file-name": "photo.png", "Content-Type": "text/html" },
      }),
    );
    expect(resp.status).toBe(400);
    const body = (await resp.json()) as { error: string };
    expect(body.error).toContain("Content-Type not allowed");
  });

  it("returns 400 when file is empty (zero bytes)", async () => {
    mocks.mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    const resp = await handleUpload(
      makeRequest({
        buffer: new ArrayBuffer(0),
        headers: {
          "x-file-name": "empty.png",
          "Content-Type": "image/png",
        },
      }),
    );
    expect(resp.status).toBe(400);
    const body = (await resp.json()) as { error: string };
    expect(body.error).toBe("Empty file");
  });

  it("returns 413 when file exceeds 10 MB", async () => {
    mocks.mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    const resp = await handleUpload(
      makeRequest({
        buffer: new ArrayBuffer(11 * 1024 * 1024),
        headers: {
          "x-file-name": "large.png",
          "Content-Type": "image/png",
        },
      }),
    );
    expect(resp.status).toBe(413);
  });

  it("returns 200 with publicUrl and key on valid upload", async () => {
    mocks.mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    const resp = await handleUpload(
      makeRequest({
        buffer: new ArrayBuffer(1000),
        headers: {
          "x-file-name": "photo.png",
          "Content-Type": "image/png",
        },
      }),
    );
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { publicUrl: string; key: string };
    expect(body.publicUrl).toContain("/api/files/uploads/");
    expect(body.key).toContain("uploads/");
    expect(body.key).toContain(".png");
  });

  it("returns 501 when R2 is not configured", async () => {
    mocks.mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    mocks.mockUploadToR2.mockResolvedValue({ success: false });
    const resp = await handleUpload(
      makeRequest({
        headers: {
          "x-file-name": "photo.png",
          "Content-Type": "image/png",
        },
      }),
    );
    expect(resp.status).toBe(501);
    const body = (await resp.json()) as { error: string };
    expect(body.error).toBe("R2 not configured");
  });

  it("returns 500 when R2 put throws", async () => {
    mocks.mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    mocks.mockUploadToR2.mockRejectedValue(new Error("R2 write error"));
    const resp = await handleUpload(
      makeRequest({
        headers: {
          "x-file-name": "photo.png",
          "Content-Type": "image/png",
        },
      }),
    );
    expect(resp.status).toBe(500);
    const body = (await resp.json()) as { error: string };
    expect(body.error).toBe("Upload failed");
  });

  it("sanitizes filenames with special characters", async () => {
    mocks.mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    const resp = await handleUpload(
      makeRequest({
        headers: {
          "x-file-name": encodeURIComponent("my photo (1).png"),
          "Content-Type": "image/png",
        },
      }),
    );
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { key: string };
    expect(body.key).not.toContain(" ");
    expect(body.key).not.toContain("(");
  });
});
