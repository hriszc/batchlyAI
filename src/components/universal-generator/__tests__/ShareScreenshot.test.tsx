import { screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { renderWithProviders } from "#test/test-utils";

import { ShareScreenshot } from "../ShareScreenshot";
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

describe("ShareScreenshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state initially", () => {
    renderWithProviders(
      <ShareScreenshot
        promptTemplate="A {{cat}}"
        variableGroups={mockGroups}
        results={mockResults}
        onComplete={vi.fn()}
        onError={vi.fn()}
      />,
    );
    expect(screen.getByText(/preparing/i)).toBeInTheDocument();
  });
});
