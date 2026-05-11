import "@tanstack/react-start/server-only";

import { generateText } from "@/lib/ai";

const EXPLORE_CATEGORIES = ["ecommerce", "art", "social-media", "marketing", "general"] as const;

export type ExploreCategory = (typeof EXPLORE_CATEGORIES)[number];

export interface ExploreMetadataInput {
  prompt: string;
  model?: string;
  aspectRatio?: string;
  name?: string | null;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  previewImageUrl?: string | null;
  coverUrl?: string | null;
  resultUrls?: string[];
}

export interface ExploreMetadata {
  name: string;
  description: string;
  category: ExploreCategory;
  previewImageUrl: string | null;
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeCategory(value?: string | null): ExploreCategory | null {
  if (!value) return null;
  const normalized = collapseWhitespace(value).toLowerCase();
  if (!normalized) return null;
  if (
    normalized.includes("ecommerce") ||
    normalized.includes("commerce") ||
    normalized.includes("product") ||
    normalized.includes("shop") ||
    normalized.includes("catalog") ||
    normalized.includes("电商") ||
    normalized.includes("商品") ||
    normalized.includes("产品")
  ) {
    return "ecommerce";
  }
  if (
    normalized.includes("social") ||
    normalized.includes("instagram") ||
    normalized.includes("tiktok") ||
    normalized.includes("reel") ||
    normalized.includes("story") ||
    normalized.includes("thumbnail") ||
    normalized.includes("社交") ||
    normalized.includes("短视频") ||
    normalized.includes("小红书") ||
    normalized.includes("抖音")
  ) {
    return "social-media";
  }
  if (
    normalized.includes("marketing") ||
    normalized.includes("campaign") ||
    normalized.includes("ad") ||
    normalized.includes("banner") ||
    normalized.includes("promo") ||
    normalized.includes("poster") ||
    normalized.includes("营销") ||
    normalized.includes("广告") ||
    normalized.includes("海报") ||
    normalized.includes("宣传")
  ) {
    return "marketing";
  }
  if (
    normalized.includes("art") ||
    normalized.includes("illustr") ||
    normalized.includes("portrait") ||
    normalized.includes("character") ||
    normalized.includes("concept") ||
    normalized.includes("watercolor") ||
    normalized.includes("pixel") ||
    normalized.includes("fantasy") ||
    normalized.includes("艺术") ||
    normalized.includes("插画") ||
    normalized.includes("肖像") ||
    normalized.includes("角色") ||
    normalized.includes("概念")
  ) {
    return "art";
  }
  if (EXPLORE_CATEGORIES.includes(normalized as ExploreCategory)) {
    return normalized as ExploreCategory;
  }
  return "general";
}

function stripPromptTemplateMarkers(prompt: string): string {
  return collapseWhitespace(
    prompt
      .replace(/\{\{[^}]+\}\}/g, " ")
      .replace(/[{}]/g, " ")
      .replace(/[_*`]/g, " "),
  );
}

function titleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function inferCategory(prompt: string): ExploreCategory {
  const cleaned = prompt.toLowerCase();
  if (
    /\b(product|shop|store|commerce|package|packaging|catalog|skincare|fashion|sneaker|shoe)\b/.test(
      cleaned,
    ) ||
    /电商|商品|产品/.test(cleaned)
  ) {
    return "ecommerce";
  }
  if (
    /\b(instagram|tiktok|social|reel|story|thumbnail|influencer)\b/.test(cleaned) ||
    /社交|短视频|小红书|抖音/.test(cleaned)
  ) {
    return "social-media";
  }
  if (
    /\b(ad|banner|campaign|poster|promo|landing page|launch|brand)\b/.test(cleaned) ||
    /营销|广告|海报|宣传/.test(cleaned)
  ) {
    return "marketing";
  }
  if (
    /\b(art|illustration|painting|portrait|character|fantasy|concept|watercolor|pixel|anime)\b/.test(
      cleaned,
    ) ||
    /艺术|插画|肖像|角色|概念/.test(cleaned)
  ) {
    return "art";
  }
  return "general";
}

function inferName(prompt: string): string {
  const cleaned = stripPromptTemplateMarkers(prompt).replace(
    /\b(a|an|the|of|for|with|in|on|at|by|to|from)\b/gi,
    " ",
  );
  const hints: Array<[RegExp, string]> = [
    [/\bproduct photo\b/i, "Studio Product Shot"],
    [/\bproduct shot\b/i, "Studio Product Shot"],
    [/\bsocial media\b/i, "Social Media Post"],
    [/\b(instagram|tiktok|reel|story|thumbnail)\b/i, "Social Media Post"],
    [/\bposter\b/i, "Campaign Poster"],
    [/\b(ad|campaign|banner|promo)\b/i, "Campaign Visual"],
    [/\b(character|portrait|avatar)\b/i, "Character Portrait"],
    [/\b(interior|living room|bedroom|office|room)\b/i, "Interior Scene"],
    [/\b(landscape|street|city|travel)\b/i, "Cinematic Scene"],
  ];
  for (const [pattern, name] of hints) {
    if (pattern.test(cleaned)) return name;
  }

  const words = cleaned
    .split(" ")
    .map((word) => word.replace(/[^a-zA-Z0-9\u4e00-\u9fa5-]/g, ""))
    .filter(Boolean)
    .slice(0, 4);
  const fallback = titleCase(words.join(" "));
  return fallback || "Untitled Scene";
}

function inferDescription(prompt: string, name: string, category: ExploreCategory): string {
  const scene = name.toLowerCase();
  switch (category) {
    case "ecommerce":
      return `Use this ${scene} for product pages, campaigns, and storefront visuals.`;
    case "social-media":
      return `Use this ${scene} for posts, stories, and short-form content.`;
    case "marketing":
      return `Use this ${scene} for ads, launches, and brand promotion.`;
    case "art":
      return `Use this ${scene} for artistic concepts, moodboards, and inspiration.`;
    default: {
      const topic = stripPromptTemplateMarkers(prompt).slice(0, 80);
      return topic ? `Use this ${scene} for the prompt: ${topic}.` : `Use this ${scene} anywhere.`;
    }
  }
}

function pickPreviewImageUrl(input: ExploreMetadataInput): string | null {
  const previewCandidates = [
    input.previewImageUrl,
    ...(Array.isArray(input.resultUrls) ? input.resultUrls : []),
    input.coverUrl,
  ];
  const url = previewCandidates.find((candidate) => typeof candidate === "string" && candidate.trim());
  return url?.trim() || null;
}

function parseMetadataResponse(text: string): Partial<ExploreMetadata> {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) return {};

  try {
    const parsed = JSON.parse(trimmed.slice(start, end + 1)) as Partial<ExploreMetadata>;
    return parsed;
  } catch {
    return {};
  }
}

function cleanName(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = collapseWhitespace(value).replace(/[\\/#]/g, " ");
  return cleaned.slice(0, 64) || null;
}

function cleanDescription(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = collapseWhitespace(value).replace(/\s*[\r\n]+\s*/g, " ");
  return cleaned.slice(0, 140) || null;
}

export async function generateExploreMetadata(
  input: ExploreMetadataInput,
): Promise<ExploreMetadata> {
  const prompt = collapseWhitespace(input.prompt);
  const fallbackName = inferName(prompt || input.title || input.name || "");
  const fallbackCategory = inferCategory(prompt);
  const fallbackDescription = inferDescription(prompt, fallbackName, fallbackCategory);
  const fallbackPreviewImageUrl = pickPreviewImageUrl(input);

  const nameProvided = cleanName(input.name ?? input.title);
  const descriptionProvided = cleanDescription(input.description);
  const categoryProvided = normalizeCategory(input.category);

  const needsAi = !nameProvided || !descriptionProvided || !categoryProvided;
  let generated: Partial<ExploreMetadata> = {};

  if (needsAi && prompt) {
    try {
      const response = await generateText({
        prompt:
          [
            "You write publish-ready metadata for an AI image gallery.",
            "Return strict JSON only with keys: name, description, category.",
            "Rules:",
            "- name: 2-6 words, concrete scene or object name, no abstract adjectives.",
            "- description: one short sentence that explains the use case.",
            "- category: one of ecommerce, art, social-media, marketing, general.",
            "- Keep the language aligned with the prompt.",
            "- Do not include markdown, code fences, or extra keys.",
            "",
            `Prompt: ${prompt}`,
            input.model ? `Model: ${input.model}` : null,
            input.aspectRatio ? `Aspect ratio: ${input.aspectRatio}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        maxTokens: 220,
      });
      generated = parseMetadataResponse(response);
    } catch {
      generated = {};
    }
  }

  const name = cleanName(generated.name) || nameProvided || fallbackName;
  const category = normalizeCategory(generated.category) || categoryProvided || fallbackCategory;
  const description =
    cleanDescription(generated.description) || descriptionProvided || fallbackDescription;

  return {
    name,
    description,
    category,
    previewImageUrl: fallbackPreviewImageUrl,
  };
}

export function getExplorePreviewImageUrl(input: ExploreMetadataInput): string | null {
  return pickPreviewImageUrl(input);
}
