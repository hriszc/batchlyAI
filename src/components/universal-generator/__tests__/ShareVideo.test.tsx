import { screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { renderWithProviders } from "#test/test-utils";

import { ShareVideo } from "../ShareVideo";
import { getShareVideoDurationSeconds, pickShareVideoMimeType } from "../shareVideoUtils";
import type { GeneratedResult, VariableGroup } from "../types";

const mockResults: GeneratedResult[] = [
  {
    id: "r1",
    combination: {
      variables: { var_0: "cat" },
      prompt: "A cat in a forest",
    },
    imageUrl: "https://example.com/cat.png",
    textContent: null,
    watermark: false,
    status: "complete",
  },
];

const mockGroups: VariableGroup[] = [{ id: "var_0", values: ["cat"] }];

describe("ShareVideo helpers", () => {
  it("keeps video duration between 6 and 15 seconds", () => {
    expect(getShareVideoDurationSeconds(1)).toBe(6);
    expect(getShareVideoDurationSeconds(3)).toBe(9);
    expect(getShareVideoDurationSeconds(6)).toBe(15);
    expect(getShareVideoDurationSeconds(10)).toBe(15);
  });

  it("prefers MP4 when supported", () => {
    const recorder = {
      isTypeSupported: vi.fn((mime: string) => mime === "video/mp4;codecs=avc1.42E01E"),
    };
    expect(pickShareVideoMimeType(recorder)).toEqual({
      mimeType: "video/mp4;codecs=avc1.42E01E",
      extension: "mp4",
    });
  });

  it("falls back to WebM when MP4 is unavailable", () => {
    const recorder = {
      isTypeSupported: vi.fn((mime: string) => mime === "video/webm;codecs=vp9"),
    };
    expect(pickShareVideoMimeType(recorder)).toEqual({
      mimeType: "video/webm;codecs=vp9",
      extension: "webm",
    });
  });

  it("returns null when no video MIME type is supported", () => {
    const recorder = {
      isTypeSupported: vi.fn(() => false),
    };
    expect(pickShareVideoMimeType(recorder)).toBeNull();
  });
});

describe("ShareVideo", () => {
  it("shows loading state initially", () => {
    renderWithProviders(
      <ShareVideo
        promptTemplate="A {{cat}}"
        variableGroups={mockGroups}
        results={mockResults}
        onComplete={vi.fn()}
        onError={vi.fn()}
      />,
    );
    expect(screen.getByText(/preparing video/i)).toBeInTheDocument();
  });
});
