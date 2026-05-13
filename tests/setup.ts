import "@testing-library/jest-dom/vitest";

vi.mock("html2canvas", () => ({
  default: vi.fn(async () => ({
    toBlob: (cb: (blob: Blob | null) => void) => cb(new Blob(["mock"], { type: "image/png" })),
  })),
}));
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

(globalThis as Record<string, unknown>).__env__ = {
  FILE_URL_SIGNING_SECRET: "test-file-url-signing-secret-32-chars",
  BETTER_AUTH_SECRET: "test-better-auth-secret-32-chars",
  VITE_BASE_URL: "https://batchlyai.com",
};
process.env.FILE_URL_SIGNING_SECRET = "test-file-url-signing-secret-32-chars";
process.env.BETTER_AUTH_SECRET = "test-better-auth-secret-32-chars";
process.env.VITE_BASE_URL = "https://batchlyai.com";

afterEach(() => {
  cleanup();
});

// Mock drizzle-orm/d1 (Cloudflare-specific, not available in Node.js)
vi.mock("drizzle-orm/d1", () => ({
  drizzle: vi.fn(),
}));

// Mock window.matchMedia for jsdom
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Suppress React 19 act() warnings in test output
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  if (typeof args[0] === "string" && args[0].includes("ReactDOMTestUtils.act")) {
    return;
  }
  originalConsoleError(...args);
};
