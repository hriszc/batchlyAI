import type { FaqItem } from "@/lib/seo/geo-content";

export interface SeoLandingPage {
  slug: string;
  title: string;
  h1: string;
  description: string;
  mediaType: "image" | "video" | "both";
  templateSearch: string;
  primaryUseCases: string[];
  examples: string[];
  faq: FaqItem[];
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
    faq: [
      {
        question: "What is a batch prompt generator?",
        answer:
          "A batch prompt generator turns variable blocks inside one prompt into every possible prompt combination, then sends those combinations through image or video generation workflows.",
      },
      {
        question: "Why use BatchlyAI for batch prompts?",
        answer:
          "BatchlyAI keeps the base idea reusable while letting you compare scenes, styles, products, audiences, and formats without rewriting each prompt manually.",
      },
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
    faq: [
      {
        question: "What is an AI prompt variation generator?",
        answer:
          "An AI prompt variation generator creates many versions of a prompt by changing controlled variables such as product, audience, style, format, or scene.",
      },
      {
        question: "How does prompt variation help creative testing?",
        answer:
          "Prompt variation makes it easier to isolate which prompt choices improve output quality, visual fit, and campaign relevance.",
      },
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
    faq: [
      {
        question: "Can BatchlyAI generate product images and videos?",
        answer:
          "Yes. BatchlyAI supports product image and video workflows, so teams can test ecommerce photos, lifestyle scenes, ad visuals, and short product video concepts from reusable prompts.",
      },
      {
        question: "What product variables should I test first?",
        answer:
          "Start with background, camera angle, lighting, audience, and style. These variables usually change whether a product visual feels like a catalog image, lifestyle scene, or ad creative.",
      },
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
    faq: [
      {
        question: "Can BatchlyAI create social media images and video concepts?",
        answer:
          "Yes. BatchlyAI can generate batches of social covers, thumbnails, carousel concepts, and short-form video visual directions.",
      },
      {
        question: "Which social platforms can I plan for?",
        answer:
          "BatchlyAI prompts can include platform variables such as TikTok, YouTube, Instagram, X, LinkedIn, or Pinterest, then generate visual options for each format.",
      },
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
    faq: [
      {
        question: "How does BatchlyAI help generate ad creatives?",
        answer:
          "BatchlyAI lets you test offer angles, audiences, layouts, and visual hooks as prompt variables, then generate multiple ad creative options in one batch.",
      },
      {
        question: "Is BatchlyAI only for paid social ads?",
        answer:
          "No. The same ad creative workflows can support landing page visuals, ecommerce hero images, creator briefs, and short video concept boards.",
      },
    ],
  },
];

export function getSeoLandingPage(slug: string): SeoLandingPage | undefined {
  return seoLandingPages.find((page) => page.slug === slug);
}
