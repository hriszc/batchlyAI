/**
 * Generate hreflang links for a given path and current locale.
 * English paths are at /, Chinese paths are at /cn.
 */
export function hreflangLinks(path: string) {
  const baseUrl = "https://batchlyai.com";

  // Strip /cn prefix to get the English path
  const enPath = path.replace(/^\/cn(?=\/|$)/, "") || "/";
  // Strip leading / then prepend /cn/
  const zhPath = enPath === "/" ? "/cn" : `/cn${enPath}`;

  return [
    { rel: "alternate", hrefLang: "en", href: `${baseUrl}${enPath}` },
    { rel: "alternate", hrefLang: "zh-CN", href: `${baseUrl}${zhPath}` },
    { rel: "alternate", hrefLang: "x-default", href: `${baseUrl}${enPath}` },
  ];
}
