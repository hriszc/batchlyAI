import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { renderWithProviders } from "#test/test-utils";

import { LoginCard } from "../LoginCard";

describe("LoginCard", () => {
  const baseProps = {
    onSuccess: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders email and password inputs", () => {
    renderWithProviders(<LoginCard {...baseProps} />);
    expect(screen.getByPlaceholderText(/hello@example/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter password/)).toBeInTheDocument();
  });

  it("renders login button", () => {
    renderWithProviders(<LoginCard {...baseProps} />);
    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
  });

  it("calls onClose when backdrop is clicked", async () => {
    renderWithProviders(<LoginCard {...baseProps} />);
    const backdrop = screen.getByTestId("login-card-backdrop");
    await userEvent.click(backdrop);
    expect(baseProps.onClose).toHaveBeenCalled();
  });

});

