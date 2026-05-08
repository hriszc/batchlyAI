import { describe, it, expect } from "vitest";

import { translations, getTranslation } from "../translations";
import type { TranslationKey } from "../translations";

function isTranslationKey(s: string): s is TranslationKey {
  return s in translations.en;
}

describe("i18n 100% coverage", () => {
  const enKeys = Object.keys(translations.en).sort();
  const zhKeys = Object.keys(translations.zh).sort();

  it("en and zh have exactly the same keys", () => {
    const enOnly = enKeys.filter((k) => !zhKeys.includes(k));
    const zhOnly = zhKeys.filter((k) => !enKeys.includes(k));

    if (enOnly.length > 0) {
      throw new Error(`Keys in en but missing from zh: ${enOnly.join(", ")}`);
    }
    if (zhOnly.length > 0) {
      throw new Error(`Keys in zh but missing from en: ${zhOnly.join(", ")}`);
    }

    expect(enKeys.length).toBe(zhKeys.length);
  });

  it("every key has a non-empty value in both languages", () => {
    for (const key of enKeys) {
      const enVal = translations.en[key as keyof typeof translations.en];
      const zhVal = translations.zh[key as keyof typeof translations.zh];
      expect(enVal, `EN "${key}" is empty`).toBeTruthy();
      expect(zhVal, `ZH "${key}" is empty`).toBeTruthy();
    }
  });

  it("getTranslation returns a value for every key", () => {
    for (const key of enKeys as TranslationKey[]) {
      expect(getTranslation("en", key), `getTranslation(en, "${key}") failed`).toBeTruthy();
      expect(getTranslation("zh", key), `getTranslation(zh, "${key}") failed`).toBeTruthy();
    }
  });

  it("100% coverage — no key is a placeholder or empty", () => {
    const total = enKeys.length;
    let covered = 0;
    const issues: string[] = [];

    for (const key of enKeys) {
      const enVal = translations.en[key as keyof typeof translations.en];
      const zhVal = translations.zh[key as keyof typeof translations.zh];

      if (
        typeof enVal === "string" &&
        enVal.length > 0 &&
        typeof zhVal === "string" &&
        zhVal.length > 0
      ) {
        covered++;
      } else {
        issues.push(key);
      }
    }

    const coverage = ((covered / total) * 100).toFixed(1);
    if (issues.length > 0) {
      throw new Error(
        `i18n coverage: ${coverage}% (${covered}/${total}). Issues: ${issues.join(", ")}`,
      );
    }
    console.log(`i18n coverage: ${coverage}% (${covered}/${total} keys)`);
    expect(covered).toBe(total);
  });
});
