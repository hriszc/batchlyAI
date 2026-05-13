export interface SeoLandingPage {
  slug: string;
  title: string;
  h1: string;
  description: string;
  mediaType: "image" | "video" | "both";
  templateSearch: string;
  primaryUseCases: string[];
  examples: string[];
  faqs: { question: string; answer: string }[];
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
    faqs: [
      {
        question: "What is a batch prompt generator?",
        answer:
          "A batch prompt generator turns one reusable prompt with variables into many prompt combinations for AI image or video generation.",
      },
      {
        question: "Can BatchlyAI generate both images and videos?",
        answer:
          "Yes. BatchlyAI supports image and video workflows, so teams can test prompt variations across multiple creative formats.",
      },
      {
        question: "Who uses batch prompt generation?",
        answer:
          "Creators, marketers, ecommerce teams, and designers use batch prompt generation to compare styles, scenes, products, and campaign ideas quickly.",
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
    faqs: [
      {
        question: "How does an AI prompt variation generator work?",
        answer:
          "It expands variables such as style, product, scene, audience, and format into every prompt combination you want to test.",
      },
      {
        question: "Why test prompt variations?",
        answer:
          "Prompt variations help identify which wording, visual style, and creative direction produce the strongest AI output.",
      },
      {
        question: "Can I reuse prompt variation templates?",
        answer:
          "Yes. BatchlyAI is built around reusable templates, so proven prompt structures can be saved and run again.",
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
    faqs: [
      {
        question: "Can BatchlyAI create ecommerce product visuals?",
        answer:
          "Yes. BatchlyAI can generate batches of product image and video prompt variations for product pages, ads, and campaign tests.",
      },
      {
        question: "What product variables can I test?",
        answer:
          "Common variables include product type, background, lighting, camera angle, season, audience, and visual style.",
      },
      {
        question: "Is this useful before a photoshoot or campaign?",
        answer:
          "Yes. Teams can explore product visual directions before committing budget to a final shoot or ad concept.",
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
    faqs: [
      {
        question: "What social media assets can BatchlyAI help create?",
        answer:
          "BatchlyAI helps create prompt variations for social covers, thumbnails, carousel visuals, and short video concepts.",
      },
      {
        question: "Can I make platform-specific variations?",
        answer:
          "Yes. You can include platform, format, audience, tone, and visual hook as variables in a reusable prompt.",
      },
      {
        question: "How does this help content teams?",
        answer:
          "Content teams can compare many visual directions quickly and choose the strongest concepts before publishing.",
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
    faqs: [
      {
        question: "How can BatchlyAI support ad creative testing?",
        answer:
          "BatchlyAI generates multiple ad creative prompt variations from variables like audience, hook, product, offer, scene, and format.",
      },
      {
        question: "Can I create both static and video ad concepts?",
        answer:
          "Yes. BatchlyAI supports image and video prompt workflows for static ads, short videos, and campaign concepting.",
      },
      {
        question: "What teams benefit from ad creative generation?",
        answer:
          "Performance marketers, founders, agencies, and ecommerce teams can use BatchlyAI to explore more creative angles faster.",
      },
    ],
  },
];

export function getSeoLandingPage(slug: string): SeoLandingPage | undefined {
  return seoLandingPages.find((page) => page.slug === slug);
}
