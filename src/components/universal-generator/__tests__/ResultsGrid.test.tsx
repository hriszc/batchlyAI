import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { renderWithProviders } from "#test/test-utils";

import { ResultsGrid } from "../ResultsGrid";
import type { GeneratedResult } from "../types";

const imageResult: GeneratedResult = {
  id: "r1",
  combination: { variables: { var_0: "cat" }, prompt: "A cat" },
  imageUrl: "https://example.com/cat.png",
  textContent: null,
  watermark: false,
  status: "complete",
};

const errorResult: GeneratedResult = {
  id: "r2",
  combination: { variables: { var_0: "dog" }, prompt: "A dog" },
  imageUrl: null,
  textContent: null,
  watermark: false,
  status: "error",
};

const videoResult: GeneratedResult = {
  ...imageResult,
  id: "r3",
  imageUrl: "https://example.com/video.mp4",
  mediaType: "video",
};

const sampleResults: GeneratedResult[] = [imageResult, errorResult];

describe("ResultsGrid", () => {
  it("returns null when not generating and no results", () => {
    const { container } = renderWithProviders(<ResultsGrid results={[]} isGenerating={false} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders results heading", () => {
    renderWithProviders(<ResultsGrid results={sampleResults} isGenerating={false} />);
    expect(screen.getByText("Results")).toBeInTheDocument();
  });

  it("shows best filter by default (only images, no errors)", () => {
    renderWithProviders(<ResultsGrid results={sampleResults} isGenerating={false} />);
    // Only the image result should be visible, not the error one
    expect(screen.getByText("A cat")).toBeInTheDocument();
    expect(screen.queryByText("A dog")).not.toBeInTheDocument();
  });

  it("shows all results when show all toggled", async () => {
    renderWithProviders(<ResultsGrid results={sampleResults} isGenerating={false} />);
    // Click the Best filter toggle to show all
    await userEvent.click(screen.getByText(/Best/));
    expect(screen.getByText("A cat")).toBeInTheDocument();
    expect(screen.getByText("A dog")).toBeInTheDocument();
  });

  it("shows skeleton cards during generation", () => {
    renderWithProviders(<ResultsGrid results={[]} isGenerating={true} />);
    expect(screen.getByText("Results")).toBeInTheDocument();
    const skeletonImages = document.querySelectorAll(".animate-pulse");
    expect(skeletonImages.length).toBe(6);
  });

  it("shows completed results while generation is still running", () => {
    renderWithProviders(
      <ResultsGrid results={[imageResult]} isGenerating={true} totalExpected={3} />,
    );
    expect(screen.getByText("A cat")).toBeInTheDocument();
    expect(screen.getByText("1 ready · 2 working")).toBeInTheDocument();
    expect(document.querySelectorAll(".animate-pulse").length).toBe(2);
  });

  it("renders with Chinese heading after hydration", async () => {
    renderWithProviders(<ResultsGrid results={[imageResult]} isGenerating={false} />, {
      language: "zh",
    });
    await waitFor(() => expect(screen.getByText("生成结果")).toBeInTheDocument());
  });

  it("shows result cards when not generating", () => {
    renderWithProviders(<ResultsGrid results={[imageResult]} isGenerating={false} />);
    expect(screen.getByText("A cat")).toBeInTheDocument();
    expect(document.querySelectorAll(".animate-pulse").length).toBe(0);
  });

  it("deduplicates results with same image URL", () => {
    const dupResults: GeneratedResult[] = [
      { ...imageResult, id: "r1" },
      { ...imageResult, id: "r2" },
    ];
    renderWithProviders(<ResultsGrid results={dupResults} isGenerating={false} />);
    // Only one "A cat" should appear (the second is deduped)
    const cats = screen.getAllByText("A cat");
    expect(cats.length).toBe(1);
  });

  it("shows results saved indicator after generation", () => {
    renderWithProviders(<ResultsGrid results={[imageResult]} isGenerating={false} />);
    expect(screen.getByText(/Results saved/)).toBeInTheDocument();
  });

  // --- Share buttons ---
  it("renders image and video share buttons when handlers are provided", () => {
    const onShareImage = vi.fn();
    const onShareVideo = vi.fn();
    renderWithProviders(
      <ResultsGrid
        results={[imageResult]}
        isGenerating={false}
        onShareImage={onShareImage}
        onShareVideo={onShareVideo}
      />,
    );
    expect(screen.getByTitle("Share Image")).toBeInTheDocument();
    expect(screen.getByTitle("Share Video")).toBeInTheDocument();
  });

  it("clicking share buttons calls the matching handlers", async () => {
    const onShareImage = vi.fn();
    const onShareVideo = vi.fn();
    renderWithProviders(
      <ResultsGrid
        results={[imageResult]}
        isGenerating={false}
        onShareImage={onShareImage}
        onShareVideo={onShareVideo}
      />,
    );
    await userEvent.click(screen.getByTitle("Share Image"));
    expect(onShareImage).toHaveBeenCalledOnce();
    expect(onShareVideo).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTitle("Share Video"));
    expect(onShareVideo).toHaveBeenCalledOnce();
  });

  it("does not show video share button without completed media", () => {
    const onShareVideo = vi.fn();
    renderWithProviders(
      <ResultsGrid results={[errorResult]} isGenerating={false} onShareVideo={onShareVideo} />,
    );
    expect(screen.queryByTitle("Share Video")).not.toBeInTheDocument();
  });

  it("shows video share button for completed video media", () => {
    const onShareVideo = vi.fn();
    renderWithProviders(
      <ResultsGrid results={[videoResult]} isGenerating={false} onShareVideo={onShareVideo} />,
    );
    expect(screen.getByTitle("Share Video")).toBeInTheDocument();
  });

  it("does not show share buttons during generation", () => {
    const onShareImage = vi.fn();
    const onShareVideo = vi.fn();
    renderWithProviders(
      <ResultsGrid
        results={[]}
        isGenerating={true}
        onShareImage={onShareImage}
        onShareVideo={onShareVideo}
      />,
    );
    expect(screen.queryByTitle("Share Image")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Share Video")).not.toBeInTheDocument();
  });

  // --- Download All button ---
  it("shows download all button when results >= 2", () => {
    const multiResults: GeneratedResult[] = [
      { ...imageResult, id: "r1", imageUrl: "https://a.com/1.png" },
      { ...imageResult, id: "r2", imageUrl: "https://a.com/2.png" },
    ];
    renderWithProviders(<ResultsGrid results={multiResults} isGenerating={false} />);
    const btn = screen.getByTitle("Download All");
    expect(btn).toBeInTheDocument();
  });

  it("hides download all button when results < 2", () => {
    renderWithProviders(<ResultsGrid results={[imageResult]} isGenerating={false} />);
    expect(screen.queryByTitle("Download All")).not.toBeInTheDocument();
  });

  it("hides download all button during generation", () => {
    renderWithProviders(<ResultsGrid results={[]} isGenerating={true} />);
    expect(screen.queryByTitle("Download All")).not.toBeInTheDocument();
  });

  // --- Publish button ---
  it("renders publish button when onPublish provided", () => {
    const onPublish = vi.fn();
    renderWithProviders(
      <ResultsGrid results={[imageResult]} isGenerating={false} onPublish={onPublish} />,
    );
    const btn = screen.getByTitle("Publish as Work");
    expect(btn).toBeInTheDocument();
  });

  it("hides publish button when no image completed successfully", () => {
    const onPublish = vi.fn();
    renderWithProviders(
      <ResultsGrid results={[errorResult]} isGenerating={false} onPublish={onPublish} />,
    );
    expect(screen.queryByTitle("Publish as Work")).not.toBeInTheDocument();
  });

  it("clicking publish button calls onPublish", async () => {
    const onPublish = vi.fn();
    renderWithProviders(
      <ResultsGrid results={[imageResult]} isGenerating={false} onPublish={onPublish} />,
    );
    await userEvent.click(screen.getByTitle("Publish as Work"));
    expect(onPublish).toHaveBeenCalledOnce();
  });

  it("shows publishing state and disables publish button", () => {
    const onPublish = vi.fn();
    renderWithProviders(
      <ResultsGrid
        results={[imageResult]}
        isGenerating={false}
        onPublish={onPublish}
        isPublishing={true}
      />,
    );
    const btn = screen.getByTitle("Publish as Work");
    expect(btn).toBeDisabled();
    expect(screen.getByText("Publishing...")).toBeInTheDocument();
  });

  it("hides publish button during generation", () => {
    renderWithProviders(<ResultsGrid results={[]} isGenerating={true} onPublish={() => {}} />);
    expect(screen.queryByTitle("Publish as Work")).not.toBeInTheDocument();
  });
});
