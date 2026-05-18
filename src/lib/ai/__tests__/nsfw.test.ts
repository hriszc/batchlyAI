import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/env/server", () => ({
  env: {
    REPLICATE_API_KEY: "test-replicate-key",
    VITE_BASE_URL: "https://batchlyai.com",
  },
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import {
  assertImageUrlsSafe,
  CONTENT_SAFETY_BLOCK_MESSAGE,
  detectNsfwImage,
  filterSafeImageUrls,
} from "@/lib/ai/nsfw";

describe("nsfw image detection", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("calls the Replicate NSFW detector with an absolute image URL", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "succeeded", output: "normal" }),
    });

    await expect(detectNsfwImage("/api/generation-files/result.png")).resolves.toEqual({
      isNsfw: false,
      label: "normal",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/replicate/v1/models/falcons-ai/nsfw_image_detection/predictions"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-replicate-key",
          Prefer: "wait",
        }),
        body: JSON.stringify({
          input: { image: "https://batchlyai.com/api/generation-files/result.png" },
        }),
      }),
    );
  });

  it("marks nsfw labels as blocked", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "succeeded", output: { label: "nsfw" } }),
    });

    await expect(detectNsfwImage("https://example.com/image.png")).resolves.toEqual({
      isNsfw: true,
      label: "nsfw",
    });
  });

  it("falls back to the direct Replicate endpoint if the gateway fails", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 502, url: "https://gateway.example/predictions" })
      .mockResolvedValueOnce({
        ok: true,
        url: "https://api.replicate.com/v1/models/falcons-ai/nsfw_image_detection/predictions",
        json: () => Promise.resolve({ status: "succeeded", output: ["normal"] }),
      });

    await expect(detectNsfwImage("https://example.com/safe.png")).resolves.toMatchObject({
      isNsfw: false,
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[1][0]).toBe(
      "https://api.replicate.com/v1/models/falcons-ai/nsfw_image_detection/predictions",
    );
  });

  it("filters unsafe images and fails closed when detection errors", async () => {
    const detector = vi
      .fn()
      .mockResolvedValueOnce({ isNsfw: false, label: "normal" })
      .mockResolvedValueOnce({ isNsfw: true, label: "nsfw" })
      .mockRejectedValueOnce(new Error("detector down"));

    const result = await filterSafeImageUrls(
      [
        "https://example.com/safe.png",
        "https://example.com/blocked.png",
        "https://example.com/unknown.png",
        "https://example.com/video.mp4",
      ],
      detector,
    );

    expect(result.safeUrls).toEqual([
      "https://example.com/safe.png",
      "https://example.com/video.mp4",
    ]);
    expect(result.blockedUrls).toEqual([
      "https://example.com/blocked.png",
      "https://example.com/unknown.png",
    ]);
    expect(detector).toHaveBeenCalledTimes(3);
  });

  it("throws the product content safety message when any image is unsafe", async () => {
    await expect(
      assertImageUrlsSafe(["https://example.com/unsafe.png"], async () => ({
        isNsfw: true,
        label: "nsfw",
      })),
    ).rejects.toThrow(CONTENT_SAFETY_BLOCK_MESSAGE);
  });
});
