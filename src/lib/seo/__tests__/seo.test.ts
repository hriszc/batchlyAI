import { describe, expect, it } from "vitest";

import { hreflangLinks } from "@/lib/seo/hreflang";
import { createPageMeta } from "@/lib/seo/meta";

describe("hreflangLinks", () => {
  it("generates en + zh-CN + x-default links for root", () => {
    const links = hreflangLinks("/");
    expect(links).toHaveLength(3);
    expect(links[0].hrefLang).toBe("en");
    expect(links[1].hrefLang).toBe("zh-CN");
    expect(links[0].href).toBe("https://batchlyai.com/");
    expect(links[1].href).toBe("https://batchlyai.com/cn");
  });
  it("strips /cn prefix for English path", () => {
    const links = hreflangLinks("/cn/some-page");
    expect(links[0].href).toBe("https://batchlyai.com/some-page");
    expect(links[1].href).toBe("https://batchlyai.com/cn/some-page");
  });
});

describe("createPageMeta", () => {
  it("generates OG + Twitter meta tags", () => {
    const meta = createPageMeta({
      title: "Test",
      description: "Desc",
      path: "/test",
      locale: "en",
    });
    expect(meta.meta.find((m: any) => m.property === "og:title")?.content).toBe("Test");
    expect(meta.meta.find((m: any) => m.name === "twitter:card")?.content).toBe(
      "summary_large_image",
    );
  });
  it("uses default ogImage when not provided", () => {
    const meta = createPageMeta({ title: "T", description: "D", path: "/", locale: "en" });
    expect(meta.meta.find((m: any) => m.property === "og:image")?.content).toContain(
      "og-default.png",
    );
  });
  it("sets noindex when requested", () => {
    const meta = createPageMeta({
      title: "T",
      description: "D",
      path: "/",
      locale: "en",
      noIndex: true,
    });
    expect(meta.meta.find((m: any) => m.name === "robots")?.content).toBe("noindex");
  });
  it("includes jsonLd script when provided", () => {
    const meta = createPageMeta({
      title: "T",
      description: "D",
      path: "/",
      locale: "en",
      jsonLd: { "@type": "Article" },
    });
    expect(meta.scripts).toHaveLength(1);
    expect(meta.scripts[0].type).toBe("application/ld+json");
  });
});
