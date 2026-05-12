import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, it, expect } from "vitest";

import { translations, getTranslation } from "../translations";
import type { TranslationKey } from "../translations";

const allowedSameValueKeys = new Set<TranslationKey>([
  "siteTitle",
  "emailPlaceholder",
  "imageTurbo",
]);

const sourceFilesWithUserFacingCopy = [
  "src/components/universal-generator/GeneratorToolbar.tsx",
  "src/components/universal-generator/ResultCard.tsx",
  "src/components/universal-generator/ResultsGrid.tsx",
  "src/routes/g/$shareId.tsx",
  "src/routes/my/generations.tsx",
  "src/routes/my/works.tsx",
  "src/routes/templates/$slug.tsx",
  "src/routes/works/$workId.tsx",
  "src/routes/blog/index.tsx",
  "src/routes/blog/$slug.tsx",
];

const allowedHardcodedCopy = [
  "BatchlyAI",
  "BatchlyAI Blog",
  "AI",
  "X",
  "Twitter",
  "png",
  "txt",
  "batchlyai.com",
  "Inter",
  "system-ui",
  "sans-serif",
  "http",
  "https",
  "GET",
  "POST",
  "Content-Type",
  "summary_large_image",
  "schema.org",
  "BlogPosting",
  "Person",
  "Unknown",
  "Short",
  "Medium",
  "Long",
];

function stripNonUiCode(source: string) {
  return source
    .replace(/import[\s\S]*?;\n/g, "")
    .replace(/const meta = createPageMeta\([\s\S]*?\n\}\);/g, "")
    .replace(/head: \([\s\S]*?\n  component:/g, "component:")
    .replace(/className="[^"]*"/g, "")
    .replace(/to="[^"]*"/g, "")
    .replace(/href="[^"]*"/g, "")
    .replace(/src="[^"]*"/g, "")
    .replace(/dateTime=\{[^}]*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
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

  it("zh values are real translations, not copied English", () => {
    const copied = enKeys.filter((key) => {
      const typedKey = key as TranslationKey;
      return (
        !allowedSameValueKeys.has(typedKey) &&
        translations.en[typedKey] === translations.zh[typedKey]
      );
    });

    expect(copied, `ZH values copied from EN: ${copied.join(", ")}`).toEqual([]);
  });

  it("key UI files do not introduce hardcoded English copy", () => {
    const offenders: string[] = [];
    const visibleAttribute = /\b(?:title|placeholder|aria-label)="([^"\n]*[A-Za-z][^"\n]*)"/g;
    const jsxText = />\s*([A-Z][^<>{}\n]+?)\s*</g;

    for (const file of sourceFilesWithUserFacingCopy) {
      const source = stripNonUiCode(readFileSync(join(process.cwd(), file), "utf8"));
      for (const match of source.matchAll(visibleAttribute)) {
        const text = match[1].trim();
        if (!text || allowedHardcodedCopy.some((allowed) => text.includes(allowed))) continue;
        offenders.push(`${file}: visible attribute "${text}"`);
      }
      for (const match of source.matchAll(jsxText)) {
        const text = match[1].trim();
        if (!text || allowedHardcodedCopy.some((allowed) => text.includes(allowed))) continue;
        offenders.push(`${file}: >${text}<`);
      }
    }

    expect(offenders, `Hardcoded English UI copy: ${offenders.join("\n")}`).toEqual([]);
  });
});
