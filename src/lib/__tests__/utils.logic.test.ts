import { describe, it, expect } from "vitest";

import { cn } from "../utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("filters falsy values", () => {
    const enabled = false;
    expect(cn("foo", enabled && "bar", undefined, "baz")).toBe("foo baz");
  });

  it("handles conditional classes", () => {
    const active = true;
    const hidden = false;
    expect(cn("base", active && "active", hidden && "hidden")).toBe("base active");
  });

  it("resolves tailwind conflicts (later wins)", () => {
    expect(cn("px-4", "px-6")).toBe("px-6");
  });

  it("handles empty input", () => {
    expect(cn()).toBe("");
  });

  it("handles single class", () => {
    expect(cn("only")).toBe("only");
  });
});
