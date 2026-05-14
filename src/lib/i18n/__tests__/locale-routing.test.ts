import { describe, expect, it } from "vitest";

import {
  buildCnRedirectHref,
  getLanguageCookie,
  getPrimaryAcceptLanguage,
  isChineseLanguageTag,
  isSearchCrawler,
  shouldRedirectRootToCn,
} from "../locale-routing";

describe("locale routing", () => {
  it("detects Chinese language tags only", () => {
    expect(isChineseLanguageTag("zh-CN")).toBe(true);
    expect(isChineseLanguageTag("zh-TW")).toBe(true);
    expect(isChineseLanguageTag("en-US")).toBe(false);
    expect(isChineseLanguageTag("fr")).toBe(false);
  });

  it("reads explicit language cookie", () => {
    expect(getLanguageCookie("theme=dark; language=zh; other=1")).toBe("zh");
    expect(getLanguageCookie("language=en")).toBe("en");
    expect(getLanguageCookie("language=de")).toBeNull();
  });

  it("uses primary Accept-Language tag", () => {
    expect(getPrimaryAcceptLanguage("zh-CN,zh;q=0.9,en;q=0.8")).toBe("zh-CN");
    expect(getPrimaryAcceptLanguage("en-US,en;q=0.9")).toBe("en-US");
  });

  it("detects search crawler user agents", () => {
    expect(isSearchCrawler("Googlebot/2.1 (+http://www.google.com/bot.html)")).toBe(true);
    expect(isSearchCrawler("Mozilla/5.0 AppleWebKit/537.36")).toBe(false);
  });

  it("redirects root Chinese browsers to /cn", () => {
    expect(
      shouldRedirectRootToCn({
        pathname: "/",
        acceptLanguage: "zh-CN,zh;q=0.9,en;q=0.8",
      }),
    ).toBe(true);
  });

  it("does not redirect explicit English preference", () => {
    expect(
      shouldRedirectRootToCn({
        pathname: "/",
        storedLanguage: "en",
        acceptLanguage: "zh-CN,zh;q=0.9",
      }),
    ).toBe(false);
  });

  it("redirects explicit Chinese preference", () => {
    expect(
      shouldRedirectRootToCn({
        pathname: "/",
        storedLanguage: "zh",
        acceptLanguage: "en-US,en;q=0.9",
      }),
    ).toBe(true);
  });

  it("does not redirect /cn again", () => {
    expect(
      shouldRedirectRootToCn({
        pathname: "/cn",
        acceptLanguage: "zh-CN,zh;q=0.9",
      }),
    ).toBe(false);
  });

  it("does not redirect crawlers even with Chinese Accept-Language", () => {
    expect(
      shouldRedirectRootToCn({
        pathname: "/",
        acceptLanguage: "zh-CN,zh;q=0.9",
        userAgent: "Googlebot/2.1 (+http://www.google.com/bot.html)",
      }),
    ).toBe(false);
  });

  it("builds /cn redirect href with search and hash", () => {
    expect(buildCnRedirectHref("?template=demo", "#top")).toBe("/cn?template=demo#top");
  });
});
