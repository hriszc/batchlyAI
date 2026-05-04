import { describe, it, expect } from "vitest";
import { MODELS, MODEL_CATEGORIES, DEFAULT_MODEL } from "../models";

describe("MODELS", () => {
  it("has 6 models", () => {
    expect(MODELS).toHaveLength(6);
  });

  it("every model has a unique id", () => {
    const ids = MODELS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every model has required fields", () => {
    for (const m of MODELS) {
      expect(m).toHaveProperty("id");
      expect(m).toHaveProperty("label");
      expect(m).toHaveProperty("category");
      expect(m).toHaveProperty("tier");
      expect(m).toHaveProperty("provider");
      expect(m).toHaveProperty("providerModel");
      expect(m).toHaveProperty("creditCost");
    }
  });

  it("every model id starts with z-", () => {
    for (const m of MODELS) {
      expect(m.id.startsWith("z-")).toBe(true);
    }
  });

  it("every credit cost is a positive number", () => {
    for (const m of MODELS) {
      expect(m.creditCost).toBeGreaterThan(0);
    }
  });

  it("DEFAULT_MODEL exists in MODELS", () => {
    expect(MODELS.find((m) => m.id === DEFAULT_MODEL)).toBeDefined();
  });

  it("has valid categories", () => {
    const validCategories = ["image", "video", "text"];
    for (const m of MODELS) {
      expect(validCategories).toContain(m.category);
    }
  });

  it("has valid tiers", () => {
    const validTiers = ["fast", "pro"];
    for (const m of MODELS) {
      expect(validTiers).toContain(m.tier);
    }
  });
});

describe("MODEL_CATEGORIES", () => {
  it("has 3 categories", () => {
    expect(MODEL_CATEGORIES).toHaveLength(3);
  });

  it("has unique keys", () => {
    const keys = MODEL_CATEGORIES.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("every category has label and labelZh", () => {
    for (const c of MODEL_CATEGORIES) {
      expect(c.label).toBeTruthy();
      expect(c.labelZh).toBeTruthy();
    }
  });
});
