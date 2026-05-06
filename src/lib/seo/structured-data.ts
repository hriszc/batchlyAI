/**
 * JSON-LD structured data generators for Google rich results.
 */

export interface ScriptOptions {
  type: "application/ld+json";
  children: string;
}

export function softwareAppLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "BatchlyAI",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    description:
      "Universal AI Generator — batch generate all combinations from multi-variable prompts",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };
}

export function breadcrumbLd(items: { name: string; url: string }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function webPageLd(input: {
  title: string;
  description: string;
  url: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.title,
    description: input.description,
    url: input.url,
  };
}
