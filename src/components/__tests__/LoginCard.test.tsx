import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { renderWithProviders } from "#test/test-utils";

import { LoginCard } from "../LoginCard";

vi.mock("@/lib/auth/auth-client", () => ({
  authClient: {
    signIn: { email: vi.fn() },
  },
}));

import { authClient } from "@/lib/auth/auth-client";

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

  it("shows loading state when submitting", async () => {
    // Mock authClient to never resolve (keep loading state)
    renderWithProviders(<LoginCard {...baseProps} />);
    const emailInput = screen.getByPlaceholderText(/hello@example/);
    const passwordInput = screen.getByPlaceholderText(/Enter password/);
    await userEvent.type(emailInput, "test@example.com");
    await userEvent.type(passwordInput, "password123");
    await userEvent.click(screen.getByRole("button", { name: /login/i }));
    // Login button should show loading text
    expect(screen.getByText(/logging in/i)).toBeInTheDocument();
  });
});
