import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "#test/test-utils";
import { ResultCard } from "@/components/universal-generator/ResultCard";
import type { GeneratedResult } from "@/components/universal-generator/types";

const base: GeneratedResult = {
  id: "1",
  combination: { variables: { var_0: "cat" }, prompt: "A cat" },
  imageUrl: null,
  textContent: null,
  watermark: false,
  status: "complete",
};

describe("ResultCard snapshots", () => {
  it("matches complete state with image", () => {
    const { container } = renderWithProviders(
      <ResultCard
        result={{ ...base, status: "complete", imageUrl: "https://example.com/img.png" }}
      />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it("matches error state", () => {
    const { container } = renderWithProviders(<ResultCard result={{ ...base, status: "error" }} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("matches generating state", () => {
    const { container } = renderWithProviders(
      <ResultCard result={{ ...base, status: "generating" }} />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it("matches pending state", () => {
    const { container } = renderWithProviders(
      <ResultCard result={{ ...base, status: "pending" }} />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
