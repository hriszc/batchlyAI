import { describe, expect, it } from "vitest";

import { getHomepageFaq, homepageFaq } from "@/lib/seo/geo-content";
import { hreflangLinks } from "@/lib/seo/hreflang";
import { seoLandingPages } from "@/lib/seo/landing-pages";
import { mediaTypeFromModel } from "@/lib/seo/media";
import { createPageMeta } from "@/lib/seo/meta";
import { faqPageLd, templateHowToLd } from "@/lib/seo/structured-data";

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
    expect(meta.meta.find((m: any) => m.property === "og:image")?.content).toBe(
      "https://batchlyai.com/og-default.png",
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
  it("includes multiple jsonLd scripts when provided", () => {
    const meta = createPageMeta({
      title: "T",
      description: "D",
      path: "/",
      locale: "en",
      jsonLd: [{ "@type": "WebPage" }, { "@type": "FAQPage" }],
    });
    expect(meta.scripts).toHaveLength(2);
    expect(meta.scripts.map((script) => JSON.parse(script.children)["@type"])).toEqual([
      "WebPage",
      "FAQPage",
    ]);
  });
});

describe("mediaTypeFromModel", () => {
  it("classifies image, video, text, and missing models", () => {
    expect(mediaTypeFromModel("z-video-fast")).toBe("video");
    expect(mediaTypeFromModel("z-text-pro")).toBe("text");
    expect(mediaTypeFromModel("z-image-pro")).toBe("image");
    expect(mediaTypeFromModel(null)).toBe("image");
  });
});

describe("seoLandingPages", () => {
  it("provides indexable image and video entry points", () => {
    expect(seoLandingPages.some((page) => page.slug === "ai-product-visual-generator")).toBe(true);
    expect(seoLandingPages.every((page) => page.title.includes("BatchlyAI"))).toBe(true);
    expect(seoLandingPages.every((page) => page.mediaType === "both")).toBe(true);
    expect(seoLandingPages.every((page) => page.faq.length >= 3)).toBe(true);
  });
});

describe("faqPageLd", () => {
  it("maps visible FAQ content into FAQPage JSON-LD", () => {
    const ld = faqPageLd(homepageFaq);
    expect(ld["@type"]).toBe("FAQPage");
    expect(JSON.stringify(ld)).toContain("What is BatchlyAI?");
    expect(JSON.stringify(ld)).toContain("batch AI image and video generator");
  });

  it("provides Chinese homepage FAQ content", () => {
    const faq = getHomepageFaq("zh");
    expect(faq).toHaveLength(homepageFaq.length);
    expect(faq[0].question).toContain("BatchlyAI 是什么");
    expect(faq[3].answer).toContain("视频工作流");
  });
});

describe("templateHowToLd", () => {
  it("describes video templates as video generation workflows", () => {
    const ld = templateHowToLd({
      name: "Product video",
      description: "Create product video variants",
      promptTemplate: "Create {{style}} product video",
      mediaType: "video",
    });
    expect(JSON.stringify(ld)).toContain("batch AI videos");
  });
});
