import { describe, it, expect } from "vitest";

import { translations, getTranslation } from "../translations";
import type { TranslationKey } from "../translations";

describe("translations", () => {
  it("both languages have the same keys", () => {
    const enKeys = Object.keys(translations.en).sort();
    const zhKeys = Object.keys(translations.zh).sort();
    expect(enKeys).toEqual(zhKeys);
  });

  it("every English translation is a non-empty string", () => {
    for (const [key, value] of Object.entries(translations.en)) {
      expect(value, `Missing English translation for "${key}"`).toBeTruthy();
    }
  });

  it("every Chinese translation is a non-empty string", () => {
    for (const [key, value] of Object.entries(translations.zh)) {
      expect(value, `Missing Chinese translation for "${key}"`).toBeTruthy();
    }
  });
});

describe("getTranslation", () => {
  it("returns English translation", () => {
    expect(getTranslation("en", "siteTitle")).toBe("BatchlyAI");
    expect(getTranslation("en", "generate")).toBe("Generate");
  });

  it("returns Chinese translation", () => {
    expect(getTranslation("zh", "siteTitle")).toBe("BatchlyAI");
    expect(getTranslation("zh", "generate")).toBe("开始生成");
  });

  it("returns value for every known key in both languages", () => {
    const keys = Object.keys(translations.en) as TranslationKey[];
    for (const key of keys) {
      expect(getTranslation("en", key)).toBeTruthy();
      expect(getTranslation("zh", key)).toBeTruthy();
    }
  });
});
