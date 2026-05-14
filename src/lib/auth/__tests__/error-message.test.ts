import { describe, expect, it } from "vitest";

import { getAuthErrorMessage } from "@/lib/auth/error-message";

describe("getAuthErrorMessage", () => {
  it("returns an Error message", () => {
    expect(getAuthErrorMessage(new Error("Invalid password"), "fallback")).toBe("Invalid password");
  });

  it("returns a direct message", () => {
    expect(getAuthErrorMessage({ message: "Invalid origin" }, "fallback")).toBe("Invalid origin");
  });

  it("returns a nested auth error message", () => {
    expect(getAuthErrorMessage({ error: { message: "Email not verified" } }, "fallback")).toBe(
      "Email not verified",
    );
  });

  it("falls back when no message is present", () => {
    expect(getAuthErrorMessage({ error: { code: "UNKNOWN" } }, "fallback")).toBe("fallback");
  });
});
