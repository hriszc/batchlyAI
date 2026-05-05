import { screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { renderWithProviders } from "#test/test-utils";

import { ResultCard } from "../ResultCard";
import type { GeneratedResult } from "../types";

const completeResult: GeneratedResult = {
  id: "result_1",
  combination: {
    variables: { var_0: "cat", var_1: "forest" },
    prompt: "A cat in a forest",
  },
  imageUrl: "https://example.com/image.png",
  status: "complete",
};

const errorResult: GeneratedResult = {
  id: "result_2",
  combination: {
    variables: { var_0: "dog" },
    prompt: "A dog on a beach",
  },
  imageUrl: null,
  status: "error",
};

const pendingResult: GeneratedResult = {
  id: "result_3",
  combination: {
    variables: { var_0: "bird" },
    prompt: "A bird in the sky",
  },
  imageUrl: null,
  status: "pending",
};

describe("ResultCard", () => {
  it("renders prompt text", () => {
    renderWithProviders(<ResultCard result={completeResult} />);
    expect(screen.getByText("A cat in a forest")).toBeInTheDocument();
  });

  it("renders variable values", () => {
    renderWithProviders(<ResultCard result={completeResult} />);
    expect(screen.getByText(/var_0: cat/)).toBeInTheDocument();
    expect(screen.getByText(/var_1: forest/)).toBeInTheDocument();
  });

  it("renders image when imageUrl is provided", () => {
    renderWithProviders(<ResultCard result={completeResult} />);
    const img = screen.getByAltText("A cat in a forest");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/image.png");
  });

  it("shows error state for error result", () => {
    renderWithProviders(<ResultCard result={errorResult} />);
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("shows placeholder icon for pending result", () => {
    renderWithProviders(<ResultCard result={pendingResult} />);
    // ImageIcon renders an svg - we verify no image or error text
    expect(screen.queryByAltText(/bird/)).not.toBeInTheDocument();
    expect(screen.queryByText("Failed")).not.toBeInTheDocument();
  });

  it("renders without variables section when variables is empty", () => {
    const noVarsResult: GeneratedResult = {
      id: "result_4",
      combination: {
        variables: {},
        prompt: "A simple prompt",
      },
      imageUrl: null,
      status: "complete",
    };
    renderWithProviders(<ResultCard result={noVarsResult} />);
    expect(screen.getByText("A simple prompt")).toBeInTheDocument();
  });
});
