import { describe, expect, it } from "vitest";
import { generateRequestSchema, VALID_MODELS, VALID_ASPECT_RATIOS } from "@/lib/validation/schemas";

describe("generateRequestSchema", () => {
  it("accepts minimal valid request", () => {
    expect(generateRequestSchema.safeParse({ prompt: "test" }).success).toBe(true);
  });
  it("defaults aspectRatio to 1:1", () => {
    expect(generateRequestSchema.parse({ prompt: "t" }).aspectRatio).toBe("1:1");
  });
  it("defaults n to 1", () => {
    expect(generateRequestSchema.parse({ prompt: "t" }).n).toBe(1);
  });
  it("defaults model to z-image-pro", () => {
    expect(generateRequestSchema.parse({ prompt: "t" }).model).toBe("z-image-pro");
  });
  it("rejects empty prompt", () => {
    expect(generateRequestSchema.safeParse({ prompt: "" }).success).toBe(false);
  });
  it("rejects n > 10", () => {
    expect(generateRequestSchema.safeParse({ prompt: "t", n: 11 }).success).toBe(false);
  });
  it("rejects invalid model", () => {
    expect(generateRequestSchema.safeParse({ prompt: "t", model: "bad-model" }).success).toBe(false);
  });
  it("accepts valid aspect ratios", () => {
    for (const ratio of VALID_ASPECT_RATIOS) {
      expect(generateRequestSchema.safeParse({ prompt: "t", aspectRatio: ratio }).success).toBe(true);
    }
  });
  it("has all 6 models", () => expect(VALID_MODELS).toHaveLength(6));
});
