import type { Language } from "./translations";

export function parseStoredLanguage(value: string | null | undefined): Language | null {
  return value === "en" || value === "zh" ? value : null;
}

export function isChineseLanguageTag(value: string | null | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return !!normalized && (normalized === "zh" || normalized.startsWith("zh-"));
}

export function getLanguageCookie(cookieHeader: string | null | undefined): Language | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName !== "language") continue;
    try {
      return parseStoredLanguage(decodeURIComponent(rawValue.join("=")));
    } catch {
      return null;
    }
  }
  return null;
}

export function getPrimaryAcceptLanguage(acceptLanguage: string | null | undefined): string | null {
  if (!acceptLanguage) return null;
  const [primary] = acceptLanguage.split(",");
  const tag = primary?.split(";")[0]?.trim();
  return tag || null;
}

export function isSearchCrawler(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return /\b(googlebot|google-inspectiontool|bingbot|slurp|duckduckbot|baiduspider|yandexbot|sogou|bytespider)\b/i.test(
    userAgent,
  );
}

export function shouldRedirectRootToCn({
  pathname,
  storedLanguage,
  acceptLanguage,
  userAgent,
}: {
  pathname: string;
  storedLanguage?: Language | null;
  acceptLanguage?: string | null;
  userAgent?: string | null;
}): boolean {
  if (pathname.startsWith("/cn")) return false;
  if (isSearchCrawler(userAgent)) return false;
  if (storedLanguage === "en") return false;
  if (storedLanguage === "zh") return true;
  return isChineseLanguageTag(getPrimaryAcceptLanguage(acceptLanguage));
}

export function buildCnRedirectHref(search = "", hash = ""): string {
  return `/cn${search}${hash}`;
}
