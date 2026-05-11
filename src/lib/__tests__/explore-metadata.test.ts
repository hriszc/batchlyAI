import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  mockGenerateText: vi.fn(),
}));

vi.mock("@/lib/ai", () => ({
  generateText: mocks.mockGenerateText,
}));

import { generateExploreMetadata } from "@/lib/explore-metadata";

describe("generateExploreMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fills publish metadata from AI JSON and keeps a real preview image", async () => {
    mocks.mockGenerateText.mockResolvedValue(
      JSON.stringify({
        name: "Skincare Shelf Scene",
        description: "Use this for skincare product pages and launch campaigns.",
        category: "product photography",
      }),
    );

    const metadata = await generateExploreMetadata({
      prompt: "A studio product photo of {{skincare, perfume}} on {{marble, glass}}",
      model: "z-image-pro",
      aspectRatio: "9:16",
      resultUrls: ["/api/generation-files/works/work-1/0.png"],
      coverUrl: "/api/generation-files/works/work-1/cover.png",
    });

    expect(metadata).toEqual({
      name: "Skincare Shelf Scene",
      description: "Use this for skincare product pages and launch campaigns.",
      category: "ecommerce",
      previewImageUrl: "/api/generation-files/works/work-1/0.png",
    });
  });

  it("falls back locally when AI metadata generation fails", async () => {
    mocks.mockGenerateText.mockRejectedValue(new Error("AI unavailable"));

    const metadata = await generateExploreMetadata({
      prompt: "Minimal poster for a coffee campaign",
      coverUrl: "/api/generation-files/works/work-2/0.png",
    });

    expect(metadata.name).toBe("Campaign Poster");
    expect(metadata.category).toBe("marketing");
    expect(metadata.description).toContain("campaign poster");
    expect(metadata.previewImageUrl).toBe("/api/generation-files/works/work-2/0.png");
  });
});
