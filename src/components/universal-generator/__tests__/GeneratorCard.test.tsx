import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { renderWithProviders } from "#test/test-utils";

import { GeneratorCard } from "../GeneratorCard";
import { DEFAULT_MODEL } from "../models";
import type { GeneratorState } from "../types";

const mockActions = {
  setPromptTemplate: vi.fn(),
  setQuantity: vi.fn(),
  setAspectRatio: vi.fn(),
  setModel: vi.fn(),
  setTextLength: vi.fn(),
  setVideoDuration: vi.fn(),
  addValue: vi.fn(),
  updateValue: vi.fn(),
  removeValue: vi.fn(),
  startGenerating: vi.fn(),
  setError: vi.fn(),
  uploadFile: vi.fn(),
  removeAttachment: vi.fn(),
};

const baseState: GeneratorState = {
  promptTemplate: "",
  variableGroups: [],
  results: [],
  isGenerating: false,
  quantity: 2,
  aspectRatio: "9:16",
  model: DEFAULT_MODEL,
  textLength: "medium",
  videoDuration: "5s",
  error: null,
  creditsRemaining: null,
  attachedFiles: [],
};

describe("GeneratorCard", () => {
  it("renders textarea with placeholder", () => {
    renderWithProviders(<GeneratorCard state={baseState} actions={mockActions} />);
    expect(screen.getByPlaceholderText(/Describe your image/)).toBeInTheDocument();
  });

  it("renders generate button", () => {
    renderWithProviders(<GeneratorCard state={baseState} actions={mockActions} />);
    expect(screen.getByText("Generate")).toBeInTheDocument();
  });

  it("generate button is disabled when no prompt combinations", () => {
    renderWithProviders(<GeneratorCard state={baseState} actions={mockActions} />);
    const btn = screen.getByText("Generate");
    expect(btn).toBeDisabled();
  });

  it("generate button enabled when prompt has variables", () => {
    const stateWithVars: GeneratorState = {
      ...baseState,
      promptTemplate: "{{cat, dog}}",
      variableGroups: [{ id: "var_0", values: ["cat", "dog"] }],
    };
    renderWithProviders(<GeneratorCard state={stateWithVars} actions={mockActions} />);
    const btn = screen.getByText("Generate");
    expect(btn).not.toBeDisabled();
  });

  it("calls startGenerating when generate button clicked", async () => {
    const startGen = vi.fn();
    const stateWithVars: GeneratorState = {
      ...baseState,
      promptTemplate: "{{cat, dog}}",
      variableGroups: [{ id: "var_0", values: ["cat", "dog"] }],
    };
    renderWithProviders(
      <GeneratorCard
        state={stateWithVars}
        actions={{ ...mockActions, startGenerating: startGen }}
      />,
    );
    await userEvent.click(screen.getByText("Generate"));
    expect(startGen).toHaveBeenCalledOnce();
  });

  it("shows error banner when state has error", () => {
    const errorState: GeneratorState = {
      ...baseState,
      error: "Something went wrong",
    };
    renderWithProviders(<GeneratorCard state={errorState} actions={mockActions} />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("dismisses error when close button clicked", async () => {
    const setError = vi.fn();
    const errorState: GeneratorState = {
      ...baseState,
      error: "Something went wrong",
    };
    renderWithProviders(
      <GeneratorCard state={errorState} actions={{ ...mockActions, setError }} />,
    );
    // Click the × dismiss button inside the error banner
    const dismissBtn = screen.getByText("×");
    await userEvent.click(dismissBtn);
    expect(setError).toHaveBeenCalledWith(null);
  });

  it("shows generating text when isGenerating is true", () => {
    const generatingState: GeneratorState = {
      ...baseState,
      isGenerating: true,
    };
    renderWithProviders(<GeneratorCard state={generatingState} actions={mockActions} />);
    expect(screen.getByText("Generating...")).toBeInTheDocument();
  });

  it("shows attached files", () => {
    const stateWithFiles: GeneratorState = {
      ...baseState,
      attachedFiles: [
        { id: "f1", name: "reference.png", uploading: false },
        { id: "f2", name: "sketch.jpg", uploading: true },
      ],
    };
    renderWithProviders(<GeneratorCard state={stateWithFiles} actions={mockActions} />);
    expect(screen.getByText("reference.png")).toBeInTheDocument();
    expect(screen.getByText("sketch.jpg")).toBeInTheDocument();
  });

  it("calls removeAttachment when close button on file clicked", async () => {
    const removeAttachment = vi.fn();
    const stateWithFile: GeneratorState = {
      ...baseState,
      attachedFiles: [{ id: "f1", name: "ref.png", uploading: false }],
    };
    renderWithProviders(
      <GeneratorCard state={stateWithFile} actions={{ ...mockActions, removeAttachment }} />,
    );
    // Click the × button on the file chip
    const buttons = screen.getAllByText("×");
    // Find the one in the attachments area (not error banner)
    await userEvent.click(buttons[0]);
    expect(removeAttachment).toHaveBeenCalledWith("f1");
  });

  it("calls setPromptTemplate when textarea changes", async () => {
    const setPrompt = vi.fn();
    renderWithProviders(
      <GeneratorCard
        state={baseState}
        actions={{ ...mockActions, setPromptTemplate: setPrompt }}
      />,
    );
    const textarea = screen.getByPlaceholderText(/Describe your image/);
    await userEvent.type(textarea, "hello");
    expect(setPrompt).toHaveBeenCalled();
  });

  it("renders aspect ratio buttons", () => {
    renderWithProviders(<GeneratorCard state={baseState} actions={mockActions} />);
    expect(screen.getByText("16:9")).toBeInTheDocument();
    expect(screen.getByText("1:1")).toBeInTheDocument();
    expect(screen.getByText("9:16")).toBeInTheDocument();
  });

  it("renders quantity buttons", () => {
    renderWithProviders(<GeneratorCard state={baseState} actions={mockActions} />);
    expect(screen.getByText(/qty/i)).toBeInTheDocument();
  });

  it("shows variable groups when prompt has variables", async () => {
    const stateWithVars: GeneratorState = {
      ...baseState,
      promptTemplate: "{{cat, dog}}",
      variableGroups: [{ id: "var_0", values: ["cat", "dog"] }],
    };
    renderWithProviders(<GeneratorCard state={stateWithVars} actions={mockActions} />);

    // Variable groups count should be visible in the group pill
    expect(screen.getByText(/1\s+groups/)).toBeInTheDocument();
  });

  it("shows credits remaining when not null", () => {
    const stateWithCredits: GeneratorState = {
      ...baseState,
      creditsRemaining: 42,
    };
    renderWithProviders(<GeneratorCard state={stateWithCredits} actions={mockActions} />);
    expect(screen.getByText(/42/)).toBeInTheDocument();
  });

  it("does not show credits remaining when null", () => {
    renderWithProviders(<GeneratorCard state={baseState} actions={mockActions} />);
    // The word "credits" appears in the estimate line but not as a standalone value
    const creditsTexts = screen.getAllByText(/credits/i);
    expect(creditsTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("renders in Chinese", () => {
    renderWithProviders(<GeneratorCard state={baseState} actions={mockActions} />, {
      language: "zh",
    });
    expect(screen.getByText("开始生成")).toBeInTheDocument();
  });

  // --- Prompt hint ---
  it("does not show promptHint (removed per TDD cleanup)", () => {
    const stateWithPrompt: GeneratorState = {
      ...baseState,
      promptTemplate: "a beautiful landscape",
    };
    renderWithProviders(<GeneratorCard state={stateWithPrompt} actions={mockActions} />);
    expect(screen.queryByText(/{{vars}}/)).not.toBeInTheDocument();
  });

  it("does not show promptHint when prompt is empty", () => {
    renderWithProviders(<GeneratorCard state={baseState} actions={mockActions} />);
    expect(screen.queryByText(/{{vars}}/)).not.toBeInTheDocument();
  });

  // --- Insufficient credits CTA ---
  it("shows Buy Credits button when error is insufficient credits", () => {
    const creditErrorState: GeneratorState = {
      ...baseState,
      error: "Insufficient credits: need 20, have 5",
    };
    renderWithProviders(<GeneratorCard state={creditErrorState} actions={mockActions} />);
    expect(screen.getByText("Buy 1000 Credits for $10")).toBeInTheDocument();
  });

  it("does not show Buy Credits button for other errors", () => {
    const otherErrorState: GeneratorState = {
      ...baseState,
      error: "Something went wrong",
    };
    renderWithProviders(<GeneratorCard state={otherErrorState} actions={mockActions} />);
    expect(screen.queryByText("Buy 1000 Credits for $10")).not.toBeInTheDocument();
  });

  // --- Generate button disabled tooltip ---
  it("shows disabled tooltip when no combinations", () => {
    renderWithProviders(<GeneratorCard state={baseState} actions={mockActions} />);
    const btn = screen.getByText("Generate");
    expect(btn).toBeDisabled();
    expect(btn.getAttribute("title")).toContain("{{variables}}");
  });

  it("shows generating state with no title tooltip", () => {
    const genState: GeneratorState = { ...baseState, isGenerating: true };
    renderWithProviders(<GeneratorCard state={genState} actions={mockActions} />);
    expect(screen.getByText("Generating...")).toBeInTheDocument();
  });

  // --- Auto-expand variable editor on first use (prompt hint removed) ---
  it("auto-expands variable editor on first variable detection", async () => {
    localStorage.removeItem("batchlyai_variable_editor_shown");
    const stateWithVars: GeneratorState = {
      ...baseState,
      promptTemplate: "{{cat, dog}}",
      variableGroups: [{ id: "var_0", values: ["cat", "dog"] }],
    };
    renderWithProviders(<GeneratorCard state={stateWithVars} actions={mockActions} />);
    // Variable editor opens — no longer shows "Detected" message
    await waitFor(() => {
      expect(screen.queryByText(/Detected/)).not.toBeInTheDocument();
    });
  });

  // --- Removed UI hints ---
  it("does not render prompt hint text", () => {
    const stateWithPrompt: GeneratorState = {
      ...baseState,
      promptTemplate: "a cat",
    };
    renderWithProviders(<GeneratorCard state={stateWithPrompt} actions={mockActions} />);
    expect(screen.queryByText(/expand variables|自动展开/i)).not.toBeInTheDocument();
  });

  it("does not render detected groups message", () => {
    const stateWithVars: GeneratorState = {
      ...baseState,
      promptTemplate: "{{cat, dog}}",
      variableGroups: [{ id: "var_0", values: ["cat", "dog"] }],
    };
    renderWithProviders(<GeneratorCard state={stateWithVars} actions={mockActions} />);
    // Variable groups editor exists but no "Detected N groups" header
    expect(screen.queryByText(/Detected/)).not.toBeInTheDocument();
  });
});
