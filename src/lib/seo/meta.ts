export interface PageMetaInput {
  title: string;
  description: string;
  path: string;
  locale: "en" | "zh-CN";
  ogImage?: string;
  ogType?: "website" | "article";
  jsonLd?: Record<string, unknown>;
  noIndex?: boolean;
}

export function createPageMeta(input: PageMetaInput) {
  const image = input.ogImage ?? `https://batchlyai.com/og-default.png`;

  return {
    meta: [
      { title: input.title },
      { name: "description", content: input.description },
      { property: "og:title", content: input.title },
      { property: "og:description", content: input.description },
      { property: "og:image", content: image },
      { property: "og:url", content: `https://batchlyai.com${input.path}` },
      { property: "og:type", content: input.ogType ?? "website" },
      { property: "og:locale", content: input.locale },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: input.title },
      { name: "twitter:description", content: input.description },
      { name: "twitter:image", content: image },
      ...(input.noIndex
        ? [{ name: "robots" as const, content: "noindex" }]
        : [{ name: "robots" as const, content: "index, follow" }]),
    ],
    links: [] as Array<{ rel: string; href?: string; hrefLang?: string }>,
    scripts: input.jsonLd
      ? [{ type: "application/ld+json", children: JSON.stringify(input.jsonLd) }]
      : [],
  };
}
