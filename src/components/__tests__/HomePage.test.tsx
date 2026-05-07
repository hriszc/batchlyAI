import { screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { renderWithProviders } from "#test/test-utils";

import { HomePage, shouldRedirectToCn } from "../HomePage";

describe("shouldRedirectToCn", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("returns true for Chinese browser with no saved preference", () => {
    vi.stubGlobal("navigator", { language: "zh-CN" });
    expect(shouldRedirectToCn()).toBe(true);
  });

  it("returns true for zh-TW variant", () => {
    vi.stubGlobal("navigator", { language: "zh-TW" });
    expect(shouldRedirectToCn()).toBe(true);
  });

  it("returns false when saved language is en", () => {
    vi.stubGlobal("navigator", { language: "zh-CN" });
    localStorage.setItem("language", "en");
    expect(shouldRedirectToCn()).toBe(false);
  });

  it("returns true when saved language is zh", () => {
    vi.stubGlobal("navigator", { language: "en-US" });
    localStorage.setItem("language", "zh");
    expect(shouldRedirectToCn()).toBe(true);
  });

  it("returns false for English browser", () => {
    vi.stubGlobal("navigator", { language: "en-US" });
    expect(shouldRedirectToCn()).toBe(false);
  });

  it("returns false for non-Chinese, non-English browser", () => {
    vi.stubGlobal("navigator", { language: "fr" });
    expect(shouldRedirectToCn()).toBe(false);
  });
});

describe("HomePage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders site title", () => {
    renderWithProviders(<HomePage />);
    expect(screen.getAllByAltText("BatchlyAI")[0]).toBeInTheDocument();
  });

  it("renders site description", () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText(/Universal AI Generator/)).toBeInTheDocument();
  });

  it("renders GeneratorCard", () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByPlaceholderText(/Describe your image/)).toBeInTheDocument();
  });

  it("renders title in Chinese when forceLanguage is zh", () => {
    renderWithProviders(<HomePage forceLanguage="zh" />, { language: "zh" });
    expect(screen.getAllByAltText("BatchlyAI")[0]).toBeInTheDocument();
  });

  it("renders with no results initially", () => {
    renderWithProviders(<HomePage />);
    expect(screen.queryByText("Results")).not.toBeInTheDocument();
  });

  // --- Prompt preservation across login ---
  it("restores pending prompt from sessionStorage on mount", () => {
    sessionStorage.setItem("pendingPrompt", "{{cat, dog}} in a forest");
    renderWithProviders(<HomePage />);
    const textarea = screen.getByPlaceholderText(/Describe your image/) as HTMLTextAreaElement;
    expect(textarea.value).toBe("{{cat, dog}} in a forest");
  });
});
