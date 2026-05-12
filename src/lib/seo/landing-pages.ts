export interface SeoLandingPage {
  slug: string;
  title: string;
  h1: string;
  description: string;
  mediaType: "image" | "video" | "both";
  templateSearch: string;
  primaryUseCases: string[];
  examples: string[];
}

export const seoLandingPages: SeoLandingPage[] = [
  {
    slug: "batch-prompt-generator",
    title: "Batch Prompt Generator for AI Images and Videos — BatchlyAI",
    h1: "Batch prompt generator for AI images and videos",
    description:
      "Turn one prompt template into every variable combination, then generate AI images or videos in one batch.",
    mediaType: "both",
    templateSearch: "batch prompt",
    primaryUseCases: ["Prompt variation testing", "Creative exploration", "Reusable templates"],
    examples: [
      "Generate 24 product visual directions from one prompt",
      "Test multiple backgrounds, styles, and camera angles",
      "Reuse proven prompts across image and video models",
    ],
  },
  {
    slug: "prompt-variation-generator",
    title: "AI Prompt Variation Generator — BatchlyAI",
    h1: "AI prompt variation generator",
    description:
      "Create every combination from prompt variables like product, style, scene, audience, and format.",
    mediaType: "both",
    templateSearch: "variation",
    primaryUseCases: ["A/B testing", "Style exploration", "Prompt engineering"],
    examples: [
      "Compare ten brand styles for the same product",
      "Generate multiple ad concepts from the same offer",
      "Find the prompt variables that produce the best result",
    ],
  },
  {
    slug: "ai-product-visual-generator",
    title: "AI Product Image and Video Generator — BatchlyAI",
    h1: "AI product image and video generator",
    description:
      "Batch-generate product photos, short product videos, and ecommerce creative variations from reusable prompts.",
    mediaType: "both",
    templateSearch: "product",
    primaryUseCases: ["Ecommerce product visuals", "Shopify listings", "Amazon creative tests"],
    examples: [
      "Create product photos across studio, lifestyle, and seasonal scenes",
      "Generate short product video prompt variations",
      "Test ecommerce hero visuals before a campaign",
    ],
  },
  {
    slug: "ai-social-media-generator",
    title: "AI Social Media Image and Video Generator — BatchlyAI",
    h1: "AI social media image and video generator",
    description:
      "Create batches of social covers, carousel visuals, short video concepts, and thumbnail variations.",
    mediaType: "both",
    templateSearch: "social",
    primaryUseCases: ["Short-form video concepts", "Social covers", "Carousel visuals"],
    examples: [
      "Generate multiple cover directions for one topic",
      "Compare social thumbnail layouts before publishing",
      "Create platform-specific visual variations",
    ],
  },
  {
    slug: "ai-ad-creative-generator",
    title: "AI Ad Creative Generator for Images and Videos — BatchlyAI",
    h1: "AI ad creative generator for images and videos",
    description:
      "Batch-generate paid social ad image and video variations for offers, audiences, visual hooks, and styles.",
    mediaType: "both",
    templateSearch: "ad creative",
    primaryUseCases: ["Paid social tests", "Creative iteration", "Offer visualization"],
    examples: [
      "Create several ad visual hooks for one product",
      "Test audiences, tones, and layouts in one batch",
      "Generate static image and short video ad concepts",
    ],
  },
];

export function getSeoLandingPage(slug: string): SeoLandingPage | undefined {
  return seoLandingPages.find((page) => page.slug === slug);
}
