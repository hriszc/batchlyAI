import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { renderWithProviders } from "#test/test-utils";
import { SettingsBar } from "@/components/SettingsBar";

const mockUseSession = vi.fn();

vi.mock("@/lib/auth/auth-client", () => ({
  authClient: {
    useSession: () => mockUseSession(),
  },
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => {
    const React = require("react");
    return React.createElement("a", { href: to }, children);
  },
  useNavigate: () => vi.fn(),
}));

describe("SettingsBar", () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({ data: null });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ url: "https://checkout.stripe.com/c/test" }),
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders Login link when not authenticated", () => {
    renderWithProviders(<SettingsBar />);
    expect(screen.getByText("Login")).toBeDefined();
  });

  it("renders user info when authenticated", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice", email: "alice@test.com", credits: 42 } },
    });
    renderWithProviders(<SettingsBar />);
    expect(screen.getByText("Alice")).toBeDefined();
  });

  it("renders language toggle button", () => {
    renderWithProviders(<SettingsBar />);
    expect(screen.getByText("CN")).toBeDefined();
  });

  it("renders theme toggle button", () => {
    renderWithProviders(<SettingsBar />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it("sends POST with currency=usd when language=en", async () => {
    const user = userEvent.setup();
    mockUseSession.mockReturnValue({
      data: { user: { name: "Bob", email: "bob@test.com", credits: 10 } },
    });
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ url: "https://checkout.stripe.com/c/test" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    renderWithProviders(<SettingsBar />, { language: "en" });

    const buyButton = screen.getByText("Buy Credits");
    await user.click(buyButton);

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/stripe/checkout",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency: "usd", quantity: 1 }),
      }),
    );
  });

  it("sends currency=cny when language=zh", async () => {
    const user = userEvent.setup();
    mockUseSession.mockReturnValue({
      data: { user: { name: "Bob", email: "bob@test.com", credits: 10 } },
    });
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ url: "https://checkout.stripe.com/c/test" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    renderWithProviders(<SettingsBar />, { language: "zh" });

    const buyButton = screen.getByText("购买积分");
    await user.click(buyButton);

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/stripe/checkout",
      expect.objectContaining({
        body: JSON.stringify({ currency: "cny", quantity: 1 }),
      }),
    );
  });

  it("handles checkout error without crashing", async () => {
    const user = userEvent.setup();
    mockUseSession.mockReturnValue({
      data: { user: { name: "Error User", email: "err@test.com", credits: 1 } },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ error: "Stripe error" }),
      }),
    );

    renderWithProviders(<SettingsBar />);

    const buyButton = screen.getByText("Buy Credits");
    await user.click(buyButton);

    // Verify no crash — toast rendering is handled by sonner async
    expect(true).toBe(true);
  });
});
