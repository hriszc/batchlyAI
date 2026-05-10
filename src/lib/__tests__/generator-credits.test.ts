import { describe, expect, it } from "vitest";

import { calculateGenerationCredits, CREDIT_COST } from "@/lib/generator-credits";

describe("calculateGenerationCredits", () => {
  it("charges image and text models per generation unit", () => {
    expect(
      calculateGenerationCredits({
        model: "z-image-pro",
        quantity: 3,
      }),
    ).toBe(CREDIT_COST["z-image-pro"] * 3);

    expect(
      calculateGenerationCredits({
        model: "z-text-fast",
        quantity: 2,
      }),
    ).toBe(CREDIT_COST["z-text-fast"] * 2);
  });

  it("charges video models by duration", () => {
    expect(
      calculateGenerationCredits({
        model: "z-video-fast",
        quantity: 2,
        durationSeconds: 10,
      }),
    ).toBe(CREDIT_COST["z-video-fast"] * 2 * 10);
  });

  it("uses the default video duration when omitted", () => {
    expect(
      calculateGenerationCredits({
        model: "z-video-pro",
        quantity: 1,
      }),
    ).toBe(CREDIT_COST["z-video-pro"] * 5);
  });
});
