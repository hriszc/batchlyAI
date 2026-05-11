import { describe, expect, it } from "vitest";

import { createSignedFileUrl, hasValidSignedFileAccess } from "@/lib/cloudflare/file-url-signing";

describe("file-url-signing", () => {
  it("creates a signed URL that verifies against the same path", async () => {
    const url = await createSignedFileUrl("/api/files/uploads/u1/photo.png");
    const request = new Request(url);

    await expect(
      hasValidSignedFileAccess(request, "/api/files/uploads/u1/photo.png"),
    ).resolves.toBe(true);
  });

  it("creates an absolute URL", async () => {
    const url = await createSignedFileUrl("/api/files/uploads/u1/photo.png");
    expect(url).toMatch(/^https:\/\/batchlyai\.com\/api\/files\/uploads\/u1\/photo\.png\?/);
  });

  it("rejects unsigned URLs", async () => {
    const request = new Request("https://batchlyai.com/api/files/uploads/u1/photo.png");

    await expect(
      hasValidSignedFileAccess(request, "/api/files/uploads/u1/photo.png"),
    ).resolves.toBe(false);
  });
});
