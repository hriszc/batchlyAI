import { describe, expect, it } from "vitest";

import { sanitizeFilename } from "@/lib/upload/sanitize";

describe("sanitizeFilename", () => {
  it("returns clean filename unchanged", () =>
    expect(sanitizeFilename("photo.png")).toBe("photo.png"));
  it("replaces slashes with underscores", () =>
    expect(sanitizeFilename("a/b/c.png")).toBe("a_b_c.png"));
  it("replaces special chars", () =>
    expect(sanitizeFilename("my photo (1).png")).toBe("my_photo_1_.png"));
  it("removes leading dots", () => expect(sanitizeFilename("..hidden")).toBe("hidden"));
  it("collapses multiple underscores", () => expect(sanitizeFilename("a___b")).toBe("a_b"));
  it("trims leading/trailing underscores", () => expect(sanitizeFilename("_test_")).toBe("test"));
  it("truncates to 200 chars", () =>
    expect(sanitizeFilename("a".repeat(250) + ".png").length).toBeLessThanOrEqual(200));
  it("returns 'upload' for empty result", () => expect(sanitizeFilename("___")).toBe("upload"));
  it("removes null bytes", () => expect(sanitizeFilename("a\0b.png")).toBe("ab.png"));
  it("handles unicode by replacing", () => expect(sanitizeFilename("中文.png")).toBe(".png"));
  it("preserves dots and hyphens", () =>
    expect(sanitizeFilename("my-file.v1.0.png")).toBe("my-file.v1.0.png"));
});
