import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockR2Get = vi.fn();
  const mockWriteHttpMetadata = vi.fn();
  return { mockGetSession, mockR2Get, mockWriteHttpMetadata };
});

vi.mock("@/lib/auth/auth", () => ({
  createAuth: () => ({
    api: { getSession: mocks.mockGetSession },
  }),
}));

import { createSignedFileUrl } from "@/lib/cloudflare/file-url-signing";
import { handleFile } from "@/routes/api/files/$";

function makeRequest(overrides?: { origin?: string }): Request {
  return {
    headers: new Headers(overrides?.origin ? { Origin: overrides.origin } : {}),
  } as unknown as Request;
}

describe("handleFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockGetSession.mockResolvedValue({ user: { id: "user-abc" } });
    mocks.mockR2Get.mockResolvedValue({
      body: new ReadableStream(),
      writeHttpMetadata: mocks.mockWriteHttpMetadata,
    });
    (globalThis as Record<string, unknown>).__env__ = {
      batchlyai_r2: { get: mocks.mockR2Get },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as Record<string, unknown>).__env__;
  });

  it("returns 501 when R2 binding is not available", async () => {
    delete (globalThis as Record<string, unknown>).__env__;
    const resp = await handleFile(makeRequest(), { _splat: "uploads/user/test.png" });
    expect(resp.status).toBe(501);
  });

  it("returns 404 when key is empty", async () => {
    const resp = await handleFile(makeRequest(), { _splat: "" });
    expect(resp.status).toBe(404);
  });

  it("returns 401 when not authenticated", async () => {
    mocks.mockGetSession.mockResolvedValue(null);
    const resp = await handleFile(makeRequest(), { _splat: "uploads/user/file.png" });
    expect(resp.status).toBe(401);
  });

  it("allows signed URLs without authentication", async () => {
    mocks.mockGetSession.mockResolvedValue(null);
    const signed = await createSignedFileUrl("/api/files/uploads/user-abc/file.png");
    const resp = await handleFile(
      {
        headers: new Headers(),
        url: `https://batchlyai.com${signed}`,
      } as unknown as Request,
      { _splat: "uploads/user-abc/file.png" },
    );
    expect(resp.status).toBe(200);
  });

  it("returns 404 when file does not belong to user", async () => {
    const resp = await handleFile(makeRequest(), {
      _splat: "uploads/other-user/file.png",
    });
    expect(resp.status).toBe(404);
  });

  it("returns 404 when R2 object does not exist", async () => {
    mocks.mockR2Get.mockResolvedValue(null);
    const resp = await handleFile(makeRequest(), {
      _splat: "uploads/user-abc/file.png",
    });
    expect(resp.status).toBe(404);
  });

  it("returns 200 with file body when user owns it", async () => {
    const resp = await handleFile(makeRequest(), {
      _splat: "uploads/user-abc/123_test.png",
    });
    expect(resp.status).toBe(200);
    expect(mocks.mockR2Get).toHaveBeenCalledWith("uploads/user-abc/123_test.png");
  });

  it("sets cache and security headers", async () => {
    const resp = await handleFile(makeRequest(), {
      _splat: "uploads/user-abc/photo.png",
    });
    expect(resp.status).toBe(200);
    expect(resp.headers.get("Cache-Control")).toBe("private, max-age=86400");
    expect(resp.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(resp.headers.get("Content-Disposition")).toBe("attachment");
  });

  it("sets CORS header for allowed origin", async () => {
    const resp = await handleFile(makeRequest({ origin: "https://batchlyai.com" }), {
      _splat: "uploads/user-abc/img.png",
    });
    expect(resp.headers.get("Access-Control-Allow-Origin")).toBe("https://batchlyai.com");
  });

  it("does not set CORS for disallowed origin", async () => {
    const resp = await handleFile(makeRequest({ origin: "https://evil.com" }), {
      _splat: "uploads/user-abc/img.png",
    });
    expect(resp.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("returns 500 when R2 get throws", async () => {
    mocks.mockR2Get.mockRejectedValue(new Error("R2 read error"));
    const resp = await handleFile(makeRequest(), {
      _splat: "uploads/user-abc/img.png",
    });
    expect(resp.status).toBe(500);
  });

  it("handles sanitized user IDs with special chars", async () => {
    mocks.mockGetSession.mockResolvedValue({ user: { id: "user@domain.com" } });
    // The sanitized ID should replace @ and . with _
    const resp = await handleFile(makeRequest(), {
      _splat: "uploads/user_domain_com/pic.png",
    });
    expect(resp.status).toBe(200);
  });
});
