import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { renderWithProviders } from "#test/test-utils";

import type { VariableGroup } from "../types";
import { VariableGroupCard } from "../VariableGroupCard";

const baseGroup: VariableGroup = {
  id: "var_0",
  values: ["cat", "dog"],
};

describe("VariableGroupCard", () => {
  it("renders group label with correct index", () => {
    renderWithProviders(
      <VariableGroupCard
        group={baseGroup}
        index={0}
        onAddValue={vi.fn()}
        onUpdateValue={vi.fn()}
        onRemoveValue={vi.fn()}
      />,
    );
    expect(screen.getByText("Group 1")).toBeInTheDocument();
  });

  it("renders all values as input fields", () => {
    renderWithProviders(
      <VariableGroupCard
        group={baseGroup}
        index={0}
        onAddValue={vi.fn()}
        onUpdateValue={vi.fn()}
        onRemoveValue={vi.fn()}
      />,
    );
    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toHaveValue("cat");
    expect(inputs[1]).toHaveValue("dog");
  });

  it("shows no values message when group is empty", () => {
    const emptyGroup: VariableGroup = { id: "var_0", values: [] };
    renderWithProviders(
      <VariableGroupCard
        group={emptyGroup}
        index={0}
        onAddValue={vi.fn()}
        onUpdateValue={vi.fn()}
        onRemoveValue={vi.fn()}
      />,
    );
    expect(screen.getAllByText("No values")).toHaveLength(2);
  });

  it("shows values count when values exist", () => {
    renderWithProviders(
      <VariableGroupCard
        group={baseGroup}
        index={0}
        onAddValue={vi.fn()}
        onUpdateValue={vi.fn()}
        onRemoveValue={vi.fn()}
      />,
    );
    expect(screen.getByText("2 values")).toBeInTheDocument();
  });

  it("calls onAddValue when add button is clicked", async () => {
    const onAdd = vi.fn();
    renderWithProviders(
      <VariableGroupCard
        group={baseGroup}
        index={0}
        onAddValue={onAdd}
        onUpdateValue={vi.fn()}
        onRemoveValue={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByText("Add value"));
    expect(onAdd).toHaveBeenCalledOnce();
  });

  it("calls onUpdateValue when input changes", async () => {
    const onUpdate = vi.fn();
    renderWithProviders(
      <VariableGroupCard
        group={{ id: "var_0", values: ["cat"] }}
        index={0}
        onAddValue={vi.fn()}
        onUpdateValue={onUpdate}
        onRemoveValue={vi.fn()}
      />,
    );
    const input = screen.getByRole("textbox");
    await userEvent.clear(input);
    await userEvent.type(input, "bird");
    // onUpdateValue is called for each character typed
    expect(onUpdate).toHaveBeenCalled();
  });

  it("calls onAddValue when Enter is pressed in input", async () => {
    const onAdd = vi.fn();
    renderWithProviders(
      <VariableGroupCard
        group={{ id: "var_0", values: ["cat"] }}
        index={0}
        onAddValue={onAdd}
        onUpdateValue={vi.fn()}
        onRemoveValue={vi.fn()}
      />,
    );
    const input = screen.getByRole("textbox");
    await userEvent.type(input, "{Enter}");
    expect(onAdd).toHaveBeenCalledOnce();
  });

  it("renders with Chinese translations", () => {
    renderWithProviders(
      <VariableGroupCard
        group={baseGroup}
        index={1}
        onAddValue={vi.fn()}
        onUpdateValue={vi.fn()}
        onRemoveValue={vi.fn()}
      />,
      { language: "zh" },
    );
    expect(screen.getByText("变量组 2")).toBeInTheDocument();
    expect(screen.getByText("添加值")).toBeInTheDocument();
  });
});
