export interface FaqItem {
  question: string;
  answer: string;
}

export interface ExamplePage {
  slug: string;
  title: string;
  h1: string;
  description: string;
  audience: string;
  promptTemplate: string;
  variables: string[];
  outcomes: string[];
  faq: FaqItem[];
}

export const homepageFaq: FaqItem[] = [
  {
    question: "What is BatchlyAI?",
    answer:
      "BatchlyAI is a batch AI image and video generator. It turns prompt variables into every combination, so one reusable prompt can create many product visuals, ad creatives, social assets, or video concepts.",
  },
  {
    question: "Who is BatchlyAI for?",
    answer:
      "BatchlyAI is built for ecommerce operators, marketers, creators, designers, and prompt engineers who need to test many visual directions without rewriting prompts one by one.",
  },
  {
    question: "How is BatchlyAI different from a normal AI image generator?",
    answer:
      "Most generators run one prompt at a time. BatchlyAI lets you define variables such as product, background, style, audience, and format, then generates all combinations in a single workflow.",
  },
  {
    question: "Does BatchlyAI support video?",
    answer:
      "Yes. BatchlyAI supports image and video workflows, so teams can explore static product visuals and short video concepts from the same prompt variation system.",
  },
];

export const homepageFaqZh: FaqItem[] = [
  {
    question: "BatchlyAI 是什么？",
    answer:
      "BatchlyAI 是一个 AI 图片与视频批量生成器。你可以把产品、场景、风格、受众等写成 Prompt 变量，系统会一次生成所有组合。",
  },
  {
    question: "BatchlyAI 适合谁使用？",
    answer:
      "BatchlyAI 适合电商运营、市场团队、内容创作者、设计师和 Prompt 工程师，尤其适合需要快速测试多种视觉方向的人。",
  },
  {
    question: "BatchlyAI 和普通 AI 生图工具有什么区别？",
    answer:
      "普通工具通常一次跑一条 Prompt；BatchlyAI 用变量模板批量生成组合，更适合对比背景、风格、角度、受众和格式。",
  },
  {
    question: "BatchlyAI 支持视频吗？",
    answer:
      "支持。BatchlyAI 不只做图片，也支持视频工作流，可以用同一套变量思路探索商品短视频、广告视频和社媒内容方向。",
  },
];

export function getHomepageFaq(language: "en" | "zh"): FaqItem[] {
  return language === "zh" ? homepageFaqZh : homepageFaq;
}

export const aboutFaq: FaqItem[] = [
  {
    question: "What problem does BatchlyAI solve?",
    answer:
      "Creative teams often need many versions of the same idea: different scenes, formats, tones, and product angles. BatchlyAI makes that exploration repeatable by turning prompt variables into batch runs.",
  },
  {
    question: "Can BatchlyAI be used for commercial creative work?",
    answer:
      "BatchlyAI is designed for commercial creative workflows such as ecommerce product visuals, social media concepts, paid ad tests, and reusable brand prompt templates.",
  },
  {
    question: "How can users contact BatchlyAI?",
    answer:
      "Users can contact BatchlyAI at support@batchlyai.com for product questions, account issues, and partnership inquiries.",
  },
];

export const comparisonFaq: FaqItem[] = [
  {
    question: "When should I use BatchlyAI instead of a single-prompt generator?",
    answer:
      "Use BatchlyAI when you need to compare many directions: multiple backgrounds, styles, audiences, formats, or product variants. A single-prompt generator is enough only when you already know the exact output you want.",
  },
  {
    question: "Does batch generation improve prompt engineering?",
    answer:
      "Yes. Batch generation makes prompt engineering measurable because you can hold the base prompt constant and test which variables change output quality, conversion fit, or brand alignment.",
  },
  {
    question: "Is BatchlyAI only for images?",
    answer:
      "No. BatchlyAI supports both images and videos, which makes it useful for ecommerce visuals, paid social concepts, social covers, and short-form video ideation.",
  },
];

export const examplePages: ExamplePage[] = [
  {
    slug: "product-visuals",
    title: "AI Product Visual Examples — BatchlyAI",
    h1: "AI product visual examples",
    description:
      "See how one reusable product prompt can create studio, lifestyle, seasonal, and ad-ready image or video variations.",
    audience: "Ecommerce teams, Shopify operators, Amazon sellers, and product marketers.",
    promptTemplate:
      "Create a {{studio, beach, kitchen, campsite}} product visual for a {{matte tumbler, skincare bottle}} in a {{premium ecommerce, TikTok ad, minimalist catalog}} style.",
    variables: ["Product", "Scene", "Visual style", "Aspect ratio", "Image or video format"],
    outcomes: [
      "Compare studio and lifestyle directions before a campaign.",
      "Reuse one product prompt across seasonal creative tests.",
      "Generate short video concept variations from the same product variables.",
    ],
    faq: [
      {
        question: "Can BatchlyAI create ecommerce product photos?",
        answer:
          "BatchlyAI can generate ecommerce-style product image variations from reusable prompts, including studio, lifestyle, seasonal, and ad creative directions.",
      },
      {
        question: "Can the same prompt create product video concepts?",
        answer:
          "Yes. Product, scene, and style variables can be reused for short product video concepts as well as static product images.",
      },
    ],
  },
  {
    slug: "ad-creatives",
    title: "AI Ad Creative Examples — BatchlyAI",
    h1: "AI ad creative examples",
    description:
      "Use BatchlyAI to test paid social hooks, audiences, layouts, and product scenes before choosing the creative direction to produce.",
    audience: "Growth marketers, media buyers, founders, and creative strategists.",
    promptTemplate:
      "Create a {{direct response, premium brand, founder-led, UGC-style}} ad creative for {{skincare, coffee, software, fitness}} targeting {{students, creators, ecommerce owners}}.",
    variables: ["Offer angle", "Audience", "Creative style", "Product category", "Format"],
    outcomes: [
      "Create several hook directions for the same offer.",
      "Compare audience-specific visuals before launching ads.",
      "Build a library of reusable ad prompt templates.",
    ],
    faq: [
      {
        question: "How does BatchlyAI help ad creative testing?",
        answer:
          "BatchlyAI lets marketers define offer, audience, style, and format variables, then generate many ad creative directions in one batch.",
      },
      {
        question: "Is BatchlyAI a replacement for media buying tools?",
        answer:
          "No. BatchlyAI helps create and explore visual ad concepts; media buying platforms still handle targeting, spend, and campaign delivery.",
      },
    ],
  },
  {
    slug: "social-media",
    title: "AI Social Media Creative Examples — BatchlyAI",
    h1: "AI social media creative examples",
    description:
      "Generate thumbnail, cover, carousel, and short-form video concept variations for social publishing workflows.",
    audience: "Creators, social teams, newsletter operators, and content marketers.",
    promptTemplate:
      "Create a {{YouTube thumbnail, TikTok cover, Instagram carousel, LinkedIn visual}} about {{AI tools, ecommerce, productivity, design}} in a {{bold, editorial, clean, playful}} style.",
    variables: ["Platform", "Topic", "Tone", "Layout", "Image or video concept"],
    outcomes: [
      "Compare platform-specific covers before publishing.",
      "Turn one content idea into multiple visual directions.",
      "Create reusable prompt templates for recurring content series.",
    ],
    faq: [
      {
        question: "Can BatchlyAI make social media thumbnails?",
        answer:
          "BatchlyAI can generate thumbnail, cover, carousel, and short-form video concept variations from platform-specific prompt variables.",
      },
      {
        question: "Why use variables for social content?",
        answer:
          "Variables help creators compare platform, topic, layout, and tone combinations without manually rewriting every prompt.",
      },
    ],
  },
];

export function getExamplePage(slug: string): ExamplePage | undefined {
  return examplePages.find((page) => page.slug === slug);
}
