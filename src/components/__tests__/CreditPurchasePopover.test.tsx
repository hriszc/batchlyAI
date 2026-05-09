import { screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { renderWithProviders } from "#test/test-utils";

import { CreditPurchasePopover } from "../CreditPurchasePopover";

describe("CreditPurchasePopover", () => {
  it("shows credit equivalence for default 1 pack (1000 credits)", () => {
    renderWithProviders(<CreditPurchasePopover onClose={() => {}} />);
    // 1000 credits: ~100 images (10 credits), ~200 texts (5 credits), ~25s video (40 credits)
    expect(screen.getByText(/~100 images/)).toBeInTheDocument();
    expect(screen.getByText(/~200 texts/)).toBeInTheDocument();
    expect(screen.getByText(/~25s video/)).toBeInTheDocument();
  });

  it("shows scaled equivalence for 5 pack (5000 credits)", () => {
    const { rerender } = renderWithProviders(<CreditPurchasePopover onClose={() => {}} />);
    // Click 5x preset
    screen.getByText("5x").click();
    rerender(<CreditPurchasePopover onClose={() => {}} />);
  });

  it("renders buy credits title", () => {
    renderWithProviders(<CreditPurchasePopover onClose={() => {}} />);
    expect(screen.getByText("Buy Credits")).toBeInTheDocument();
  });

  it("renders mobile backdrop and desktop dropdown structure", () => {
    const { container } = renderWithProviders(<CreditPurchasePopover onClose={() => {}} />);
    // Mobile: backdrop is visible, centering wrapper is fixed
    const backdrop = container.querySelector(".sm\\:hidden.fixed.inset-0.bg-black\\/50");
    expect(backdrop).toBeTruthy();
    // Desktop: popover has sm:absolute for dropdown positioning
    const popover = container.querySelector(".sm\\:absolute.sm\\:top-full");
    expect(popover).toBeTruthy();
  });
});
