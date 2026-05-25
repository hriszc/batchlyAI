import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { renderWithProviders } from "#test/test-utils";

vi.mock("../universal-generator/ShareScreenshot", () => ({
  ShareScreenshot: () => null,
}));

const mockUseSession = vi.fn();

vi.mock("@/lib/auth/auth-client", () => ({
  authClient: {
    useSession: () => mockUseSession(),
  },
}));

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
    mockUseSession.mockReturnValue({ data: null, isPending: false });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState({}, "", "/");
  });

  it("renders site title", () => {
    renderWithProviders(<HomePage />);
    expect(screen.getAllByAltText("BatchlyAI")[0]).toBeInTheDocument();
  });

  it("renders site description", () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText(/Universal AI Generator/)).toBeInTheDocument();
  });

  it("renders the Image Pro homepage example", () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText("One short prompt. Five cinematic results.")).toBeInTheDocument();
    expect(
      screen.getAllByText("Make the person in the image cosplay as {*One Piece characters*}")[
        0
      ],
    ).toBeInTheDocument();
    expect(screen.getByText("Image Pro")).toBeInTheDocument();
  });

  it("shows the onboarding booklet to signed-out visitors and fills the example prompt", async () => {
    renderWithProviders(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText("Start with one image")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Let AI write the list")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Batch with {{ }}")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Get a small set at once")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Use this example" }));
    expect(screen.getByPlaceholderText(/Describe your image/)).toHaveValue(
      "Make the person in the image cosplay as {*One Piece characters*}",
    );
  });

  it("renders the TAAFT badge only when enabled by the root route", () => {
    renderWithProviders(<HomePage showTaaftBadge />);
    expect(screen.getByAltText("Featured on There's An AI For That")).toBeInTheDocument();
  });

  it("does not render the TAAFT badge by default", () => {
    renderWithProviders(<HomePage forceLanguage="zh" />, { language: "zh" });
    expect(screen.queryByAltText("Featured on There's An AI For That")).not.toBeInTheDocument();
  });

  it("keeps the root homepage in English for Chinese browsers before redirect completes", () => {
    vi.stubGlobal("navigator", { language: "zh-CN" });
    renderWithProviders(<HomePage forceLanguage="en" />);
    expect(screen.getByText(/Universal AI Generator/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Describe your image/)).toBeInTheDocument();
  });

  it("renders GeneratorCard", () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByPlaceholderText(/Describe your image/)).toBeInTheDocument();
  });

  it("renders generator with credits context available", () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText(/Est\. credits/i)).toBeInTheDocument();
  });

  it("renders title in Chinese when forceLanguage is zh", () => {
    renderWithProviders(<HomePage forceLanguage="zh" />, { language: "zh" });
    expect(screen.getAllByAltText("BatchlyAI")[0]).toBeInTheDocument();
    expect(screen.getByText("AI 图片与视频批量生成常见问题")).toBeInTheDocument();
    expect(screen.getByText("BatchlyAI 是什么？")).toBeInTheDocument();
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

  it("loads template query only once", async () => {
    const templateFetch = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          promptTemplate: "A {{cat, dog}} in {{forest, beach}}",
          variableGroups: [{ values: ["cat", "dog"] }],
          model: "z-image-pro",
          aspectRatio: "9:16",
        }),
    });
    vi.stubGlobal("fetch", templateFetch);
    window.history.pushState({}, "", "/?template=demo");

    renderWithProviders(<HomePage />);

    await waitFor(() => {
      expect(templateFetch).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Describe your image/)).toHaveValue(
        "A {{cat, dog}} in {{forest, beach}}",
      );
    });
    expect(templateFetch).toHaveBeenCalledTimes(1);
  });
});
