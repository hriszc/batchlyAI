import { screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { renderWithProviders } from "#test/test-utils";

import { ResultsGrid } from "../ResultsGrid";
import type { GeneratedResult } from "../types";

const sampleResults: GeneratedResult[] = [
  {
    id: "r1",
    combination: { variables: { var_0: "cat" }, prompt: "A cat" },
    imageUrl: "https://example.com/cat.png",
    textContent: null,
    watermark: false,
    status: "complete",
  },
  {
    id: "r2",
    combination: { variables: { var_0: "dog" }, prompt: "A dog" },
    imageUrl: null,
    textContent: null,
    watermark: false,
    status: "error",
  },
];

describe("ResultsGrid", () => {
  it("returns null when not generating and no results", () => {
    const { container } = renderWithProviders(<ResultsGrid results={[]} isGenerating={false} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders results heading", () => {
    renderWithProviders(<ResultsGrid results={sampleResults} isGenerating={false} />);
    expect(screen.getByText("Results")).toBeInTheDocument();
  });

  it("renders correct number of result cards", () => {
    renderWithProviders(<ResultsGrid results={sampleResults} isGenerating={false} />);
    expect(screen.getByText("A cat")).toBeInTheDocument();
    expect(screen.getByText("A dog")).toBeInTheDocument();
  });

  it("shows skeleton cards during generation", () => {
    renderWithProviders(<ResultsGrid results={[]} isGenerating={true} />);
    expect(screen.getByText("Results")).toBeInTheDocument();
    // 6 skeleton cards are rendered
    const skeletonImages = document.querySelectorAll(".animate-pulse");
    expect(skeletonImages.length).toBe(6);
  });

  it("renders with Chinese heading", () => {
    renderWithProviders(<ResultsGrid results={sampleResults} isGenerating={false} />, {
      language: "zh",
    });
    expect(screen.getByText("生成结果")).toBeInTheDocument();
  });

  it("shows result cards when not generating", () => {
    renderWithProviders(<ResultsGrid results={[sampleResults[0]]} isGenerating={false} />);
    expect(screen.getByText("A cat")).toBeInTheDocument();
    // No skeleton cards
    expect(document.querySelectorAll(".animate-pulse").length).toBe(0);
  });
});
