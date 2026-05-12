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
      "Batch AI image and video generator for prompt variations, reusable templates, and creative workflows.",
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

export function creativeWorkLd(input: {
  title: string;
  description: string;
  url: string;
  image: string;
  authorName: string;
  datePublished: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: input.title,
    description: input.description,
    url: input.url,
    image: input.image,
    author: { "@type": "Person", name: input.authorName },
    datePublished: input.datePublished,
  };
}

export function templateHowToLd(input: {
  name: string;
  description: string;
  promptTemplate: string;
  mediaType: "image" | "video" | "text";
}): Record<string, unknown> {
  const mediaLabel =
    input.mediaType === "video" ? "videos" : input.mediaType === "text" ? "text" : "images";

  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: input.name,
    description: input.description,
    step: [
      { "@type": "HowToStep", text: "Open the reusable prompt template in BatchlyAI." },
      {
        "@type": "HowToStep",
        text: `Review the variables in this prompt: ${input.promptTemplate}`,
      },
      {
        "@type": "HowToStep",
        text: `Generate batch AI ${mediaLabel} from every prompt variation in one run.`,
      },
    ],
  };
}
