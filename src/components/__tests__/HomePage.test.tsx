import { screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { renderWithProviders } from "#test/test-utils";

import { HomePage } from "../HomePage";

describe("HomePage", () => {
  it("renders site title", () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByRole("heading", { name: "BatchlyAI" })).toBeInTheDocument();
  });

  it("renders site description", () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText(/Universal AI Generator/)).toBeInTheDocument();
  });

  it("renders GeneratorCard", () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByPlaceholderText(/Use {{vars}} for batch generation/)).toBeInTheDocument();
  });

  it("renders title in Chinese when forceLanguage is zh", () => {
    renderWithProviders(<HomePage forceLanguage="zh" />, { language: "zh" });
    expect(screen.getByText(/万能 AI 生成器/)).toBeInTheDocument();
  });

  it("renders with no results initially", () => {
    renderWithProviders(<HomePage />);
    // ResultsGrid returns null when no results, so Results heading shouldn't exist
    expect(screen.queryByText("Results")).not.toBeInTheDocument();
  });
});
