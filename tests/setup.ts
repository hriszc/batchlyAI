import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

// Mock drizzle-orm/d1 (Cloudflare-specific, not available in Node.js)
vi.mock("drizzle-orm/d1", () => ({
  drizzle: vi.fn(),
}));

// Suppress React 19 act() warnings in test output
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  if (typeof args[0] === "string" && args[0].includes("ReactDOMTestUtils.act")) {
    return;
  }
  originalConsoleError(...args);
};
