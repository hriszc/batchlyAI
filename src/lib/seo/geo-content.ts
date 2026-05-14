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
  sourceLabel?: string;
  sourceUrl?: string;
  sourceNote?: string;
}

const githubImageCasesSource = {
  sourceLabel: "awesome-gpt-image-2",
  sourceUrl: "https://github.com/freestylefly/awesome-gpt-image-2/blob/main/README.zh-CN.md",
  sourceNote:
    "Inspired by public GPT-Image2 case categories. These BatchlyAI examples use original prompt templates built for repeatable batch workflows.",
};

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
  {
    ...githubImageCasesSource,
    slug: "gpt-image-case-gallery-prompts",
    title: "GPT Image Case Gallery Prompt Workflows — BatchlyAI",
    h1: "GPT image case gallery prompt workflows",
    description:
      "Turn large GPT image case libraries into reusable BatchlyAI prompt systems for UI, posters, products, brands, documents, and visual storytelling.",
    audience:
      "Prompt engineers, AI creators, design teams, and content operators building repeatable image workflows.",
    promptTemplate:
      "Create a {{UI screen, infographic, poster, product visual, brand concept, document layout}} for {{SaaS launch, ecommerce campaign, creator series, internal report}} using a {{minimal, editorial, cinematic, premium, playful}} visual direction.",
    variables: ["Case category", "Business goal", "Visual direction", "Output format", "Audience"],
    outcomes: [
      "Convert scattered inspiration into a structured prompt library.",
      "Batch-test categories from public image case collections without copying their prompts.",
      "Build SEO-friendly example pages for the highest-value visual workflows.",
    ],
    faq: [
      {
        question: "Can BatchlyAI organize GPT image examples into prompt workflows?",
        answer:
          "Yes. BatchlyAI turns recurring case categories into reusable variables, so teams can test many visual directions without rewriting each prompt.",
      },
      {
        question: "Does this page copy prompts from the GitHub case library?",
        answer:
          "No. The page uses the public case library as category inspiration and provides original BatchlyAI prompt templates for batch generation.",
      },
      {
        question: "Why make a gallery workflow instead of one prompt?",
        answer:
          "A gallery workflow helps teams compare categories, formats, and audiences, then decide which examples deserve deeper production work.",
      },
    ],
  },
  {
    ...githubImageCasesSource,
    slug: "gpt-image-ui-interface-prompts",
    title: "GPT Image UI Interface Prompts — BatchlyAI",
    h1: "GPT image UI interface prompts",
    description:
      "Generate batches of AI UI concepts for dashboards, onboarding screens, app flows, mobile layouts, and SaaS product surfaces.",
    audience: "Product designers, founders, SaaS teams, UI researchers, and prompt engineers.",
    promptTemplate:
      "Design a {{desktop dashboard, mobile onboarding flow, settings panel, analytics screen}} for {{AI workspace, finance app, creator tool, ecommerce admin}} in a {{clean SaaS, dense operator, playful consumer, premium enterprise}} style.",
    variables: ["Screen type", "Product category", "User role", "Design style", "Device format"],
    outcomes: [
      "Compare multiple interface directions before committing design time.",
      "Explore desktop and mobile layouts from one reusable prompt system.",
      "Create consistent UI image examples for product, marketing, or concept validation.",
    ],
    faq: [
      {
        question: "Can BatchlyAI generate UI design prompt variations?",
        answer:
          "Yes. BatchlyAI can batch combinations of screen type, product category, device, and visual style to explore many UI concepts quickly.",
      },
      {
        question: "Are AI UI images production-ready designs?",
        answer:
          "They are best used for concept exploration, mood direction, stakeholder alignment, and prompt testing before detailed product design work.",
      },
    ],
  },
  {
    ...githubImageCasesSource,
    slug: "gpt-image-infographic-prompts",
    title: "GPT Image Infographic Prompts — BatchlyAI",
    h1: "GPT image infographic prompts",
    description:
      "Create AI infographic and data visualization concepts for reports, explainers, technical diagrams, comparison graphics, and educational content.",
    audience:
      "Content marketers, educators, analysts, technical writers, and product marketing teams.",
    promptTemplate:
      "Create a {{comparison infographic, process diagram, data story, technical architecture visual}} explaining {{AI workflow, product feature, market trend, customer journey}} for {{executives, beginners, developers, buyers}}.",
    variables: [
      "Infographic type",
      "Topic",
      "Audience level",
      "Visual hierarchy",
      "Distribution channel",
    ],
    outcomes: [
      "Turn complex ideas into multiple visual explanation formats.",
      "Compare diagram styles for technical, executive, and educational audiences.",
      "Build repeatable infographic prompt templates for blogs and landing pages.",
    ],
    faq: [
      {
        question: "Can BatchlyAI help create infographic ideas?",
        answer:
          "BatchlyAI can generate batches of infographic concepts by varying topic, audience, layout type, and visual style.",
      },
      {
        question: "Should generated infographics be fact-checked?",
        answer:
          "Yes. Use generated infographic images as design concepts and verify all numbers, labels, and claims before publishing.",
      },
    ],
  },
  {
    ...githubImageCasesSource,
    slug: "gpt-image-poster-typography-prompts",
    title: "GPT Image Poster and Typography Prompts — BatchlyAI",
    h1: "GPT image poster and typography prompts",
    description:
      "Batch-generate poster layouts, editorial typography, event visuals, campaign key art, and text-led creative directions.",
    audience:
      "Brand designers, campaign marketers, event teams, content creators, and creative directors.",
    promptTemplate:
      "Create a {{launch poster, event announcement, editorial cover, quote graphic}} for {{AI summit, product drop, creator workshop, seasonal campaign}} using {{bold typography, Swiss grid, cinematic title treatment, magazine layout}}.",
    variables: [
      "Poster format",
      "Event or campaign",
      "Typography direction",
      "Color system",
      "Aspect ratio",
    ],
    outcomes: [
      "Explore many poster systems from the same campaign brief.",
      "Compare typography-led creative directions for social, print, and web.",
      "Create reusable prompt templates for recurring event and campaign visuals.",
    ],
    faq: [
      {
        question: "Can BatchlyAI generate typography poster concepts?",
        answer:
          "Yes. BatchlyAI can test poster format, typography style, campaign message, and aspect ratio combinations in one workflow.",
      },
      {
        question: "How should teams use generated text-heavy images?",
        answer:
          "Use them as visual concepts, then review spelling, hierarchy, and brand compliance before final production.",
      },
    ],
  },
  {
    ...githubImageCasesSource,
    slug: "gpt-image-product-ecommerce-prompts",
    title: "GPT Image Product Ecommerce Prompts — BatchlyAI",
    h1: "GPT image product ecommerce prompts",
    description:
      "Generate ecommerce product visuals, hero shots, feature breakdowns, lifestyle scenes, and marketplace creative variations.",
    audience:
      "Shopify teams, Amazon sellers, DTC brands, marketplace operators, and performance marketers.",
    promptTemplate:
      "Create a {{studio hero shot, lifestyle scene, feature breakdown, marketplace banner}} for a {{skincare bottle, smart mug, travel backpack, desk lamp}} in a {{premium, budget-friendly, outdoor, minimalist}} ecommerce style.",
    variables: ["Product", "Shot type", "Usage scene", "Buyer segment", "Marketplace format"],
    outcomes: [
      "Compare product scenes before scheduling a shoot or launch.",
      "Generate multiple marketplace and paid social creative directions.",
      "Reuse one product prompt across seasons, offers, and buyer segments.",
    ],
    faq: [
      {
        question: "Can BatchlyAI create ecommerce product image variations?",
        answer:
          "Yes. BatchlyAI is designed for product, scene, buyer segment, and format variables, which makes it useful for ecommerce image exploration.",
      },
      {
        question: "Can this workflow support product feature graphics?",
        answer:
          "Yes. You can batch feature callouts, breakdown graphics, lifestyle scenes, and hero visuals from one reusable prompt template.",
      },
    ],
  },
  {
    ...githubImageCasesSource,
    slug: "gpt-image-brand-logo-prompts",
    title: "GPT Image Brand and Logo Prompts — BatchlyAI",
    h1: "GPT image brand and logo prompts",
    description:
      "Explore logo directions, brand marks, moodboards, visual systems, packaging cues, and campaign identity concepts in batches.",
    audience:
      "Brand strategists, founders, design studios, naming teams, and early-stage product teams.",
    promptTemplate:
      "Create a {{logo exploration board, brand moodboard, icon system, packaging identity}} for a {{wellness app, AI devtool, coffee brand, boutique hotel}} with a {{calm, technical, heritage, premium}} brand personality.",
    variables: [
      "Brand asset",
      "Business category",
      "Personality",
      "Design reference",
      "Usage context",
    ],
    outcomes: [
      "Compare brand identity directions before narrowing the brief.",
      "Generate adjacent visual systems for logos, packaging, and campaign assets.",
      "Create consistent prompt variables for brand exploration workshops.",
    ],
    faq: [
      {
        question: "Can BatchlyAI generate logo ideas?",
        answer:
          "BatchlyAI can generate logo and brand concept variations, but final trademarks and production logo files still need professional review.",
      },
      {
        question: "Why batch brand prompts?",
        answer:
          "Batching helps teams compare personality, category, and usage context combinations before investing in a single brand direction.",
      },
    ],
  },
  {
    ...githubImageCasesSource,
    slug: "gpt-image-architecture-interior-prompts",
    title: "GPT Image Architecture and Interior Prompts — BatchlyAI",
    h1: "GPT image architecture and interior prompts",
    description:
      "Create architecture, interior design, workspace, retail, hospitality, and spatial concept images with repeatable prompt variables.",
    audience:
      "Interior designers, architects, real estate marketers, hospitality teams, and visualization studios.",
    promptTemplate:
      "Create a {{boutique hotel lobby, home office, retail pop-up, modern kitchen, outdoor terrace}} concept for {{luxury travelers, remote workers, families, premium shoppers}} in a {{Japandi, industrial, warm minimal, coastal, futuristic}} style.",
    variables: ["Space type", "Audience", "Interior style", "Lighting", "Material palette"],
    outcomes: [
      "Compare spatial styles before producing detailed renders.",
      "Generate moodboard-ready concepts for client conversations.",
      "Reuse space, material, and lighting variables across design briefs.",
    ],
    faq: [
      {
        question: "Can BatchlyAI generate interior design concepts?",
        answer:
          "Yes. BatchlyAI can vary space type, material palette, lighting, and audience to generate many interior or architecture concepts.",
      },
      {
        question: "Are generated architecture images construction documents?",
        answer:
          "No. They are concept visuals for ideation and communication, not technical drawings or construction-ready plans.",
      },
    ],
  },
  {
    ...githubImageCasesSource,
    slug: "gpt-image-realistic-photo-prompts",
    title: "GPT Image Realistic Photo Prompts — BatchlyAI",
    h1: "GPT image realistic photo prompts",
    description:
      "Batch realistic photo prompts for portraits, lifestyle scenes, product photography, editorial shoots, and cinematic social visuals.",
    audience:
      "Photographers, social teams, ecommerce brands, creator operators, and content studios.",
    promptTemplate:
      "Create a realistic {{portrait, lifestyle photo, product-in-use scene, editorial image}} featuring {{founder, creator, customer, product}} in {{natural window light, golden hour, studio softbox, documentary lighting}}.",
    variables: ["Photo type", "Subject", "Lighting", "Location", "Camera mood"],
    outcomes: [
      "Explore photographic styles before shoot planning.",
      "Generate creator, customer, and product image concepts at scale.",
      "Create consistent visual references for editorial and social workflows.",
    ],
    faq: [
      {
        question: "Can BatchlyAI generate realistic photo concepts?",
        answer:
          "Yes. BatchlyAI can vary subject, lighting, location, and photo type to generate realistic image directions.",
      },
      {
        question: "How should teams use AI photo concepts responsibly?",
        answer:
          "Use them for ideation, art direction, and synthetic creative tests, and avoid implying real endorsements or events when images are generated.",
      },
    ],
  },
  {
    ...githubImageCasesSource,
    slug: "gpt-image-illustration-art-prompts",
    title: "GPT Image Illustration and Art Prompts — BatchlyAI",
    h1: "GPT image illustration and art prompts",
    description:
      "Generate batches of illustration styles for editorial art, icons, book covers, learning materials, campaign visuals, and creator projects.",
    audience:
      "Illustrators, editors, educators, brand teams, creative agencies, and independent creators.",
    promptTemplate:
      "Create a {{spot illustration, editorial hero, book cover, icon set, educational visual}} about {{AI creativity, climate action, productivity, travel, finance}} in a {{flat vector, watercolor, risograph, ink sketch, 3D clay}} style.",
    variables: ["Illustration format", "Topic", "Art style", "Audience", "Publishing channel"],
    outcomes: [
      "Compare illustration styles for the same editorial or campaign idea.",
      "Build reusable prompt variables for recurring visual series.",
      "Generate art direction references before commissioning final work.",
    ],
    faq: [
      {
        question: "Can BatchlyAI test illustration styles?",
        answer:
          "Yes. BatchlyAI can batch illustration format, topic, style, audience, and publishing channel combinations.",
      },
      {
        question: "Is this useful for editorial content?",
        answer:
          "Yes. Teams can generate multiple editorial art directions for articles, newsletters, social posts, and explainers.",
      },
    ],
  },
  {
    ...githubImageCasesSource,
    slug: "gpt-image-character-design-prompts",
    title: "GPT Image Character Design Prompts — BatchlyAI",
    h1: "GPT image character design prompts",
    description:
      "Create character design sheets, mascot concepts, avatar systems, game NPC ideas, and story character variations in batches.",
    audience:
      "Game teams, brand mascot designers, storytellers, avatar product teams, and creative studios.",
    promptTemplate:
      "Design a {{brand mascot, game NPC, creator avatar, story character}} for {{kids learning app, cozy game, fintech community, fantasy newsletter}} with a {{friendly, mysterious, heroic, witty, premium}} personality.",
    variables: ["Character role", "Project type", "Personality", "Costume or props", "Pose set"],
    outcomes: [
      "Compare character personalities and silhouettes quickly.",
      "Generate mascot and avatar directions for brand or product teams.",
      "Create prompt templates for character sheets and pose variations.",
    ],
    faq: [
      {
        question: "Can BatchlyAI generate character design variations?",
        answer:
          "Yes. BatchlyAI can vary role, personality, props, pose, and project context to create batches of character concepts.",
      },
      {
        question: "Can I use this for mascot exploration?",
        answer:
          "Yes. Mascot prompt variables are a good fit because teams often need many personality and silhouette directions before choosing one.",
      },
    ],
  },
  {
    ...githubImageCasesSource,
    slug: "gpt-image-storyboard-scene-prompts",
    title: "GPT Image Storyboard and Scene Prompts — BatchlyAI",
    h1: "GPT image storyboard and scene prompts",
    description:
      "Batch storyboard frames, narrative scenes, cinematic moments, product stories, and campaign sequences for visual planning.",
    audience:
      "Video creators, campaign teams, filmmakers, game narrative designers, and content strategists.",
    promptTemplate:
      "Create a {{storyboard frame, cinematic scene, product story beat, social video keyframe}} showing {{discovery, conflict, transformation, reveal, celebration}} for {{brand film, launch video, tutorial, game trailer}}.",
    variables: ["Scene type", "Story beat", "Project format", "Camera angle", "Mood"],
    outcomes: [
      "Explore visual sequences before producing video or motion assets.",
      "Generate keyframe options for campaign narratives.",
      "Use story variables to keep scenes consistent across a batch.",
    ],
    faq: [
      {
        question: "Can BatchlyAI help storyboard visual ideas?",
        answer:
          "Yes. BatchlyAI can generate storyboard and keyframe variations by combining story beat, camera angle, project format, and mood.",
      },
      {
        question: "Is this workflow only for filmmakers?",
        answer:
          "No. It also helps product marketers, creators, and game teams plan sequences before production.",
      },
    ],
  },
  {
    ...githubImageCasesSource,
    slug: "gpt-image-chinese-history-style-prompts",
    title: "GPT Image Chinese History Style Prompts — BatchlyAI",
    h1: "GPT image Chinese history style prompts",
    description:
      "Generate Chinese historical, classical, ink painting, scroll-inspired, festival, and cultural visual concepts with controlled prompt variables.",
    audience:
      "Cultural content teams, educators, publishers, museum marketers, and visual storytellers.",
    promptTemplate:
      "Create a {{classical scroll scene, ink painting poster, festival visual, historical character study}} inspired by {{Tang poetry, Song dynasty aesthetics, traditional architecture, lantern festival}} for {{education, exhibition, editorial, social campaign}}.",
    variables: [
      "Cultural reference",
      "Visual format",
      "Historical mood",
      "Use case",
      "Composition",
    ],
    outcomes: [
      "Explore culturally specific visual directions with clear variables.",
      "Create educational and editorial concept images for heritage topics.",
      "Compare scroll, ink, poster, and character-study formats in one batch.",
    ],
    faq: [
      {
        question: "Can BatchlyAI generate classical Chinese style concepts?",
        answer:
          "Yes. BatchlyAI can batch cultural reference, format, historical mood, and composition variables for classical or heritage-inspired visuals.",
      },
      {
        question: "Should cultural prompts be reviewed?",
        answer:
          "Yes. Cultural and historical images should be reviewed for accuracy, context, and respectful representation before publishing.",
      },
    ],
  },
  {
    ...githubImageCasesSource,
    slug: "gpt-image-document-publication-prompts",
    title: "GPT Image Document and Publication Prompts — BatchlyAI",
    h1: "GPT image document and publication prompts",
    description:
      "Create publication layouts, report covers, worksheet visuals, slide concepts, document mockups, and editorial design variations.",
    audience:
      "Consultants, educators, analysts, newsletter teams, publishers, and B2B marketing teams.",
    promptTemplate:
      "Create a {{report cover, worksheet page, slide title visual, newsletter layout, publication spread}} for {{AI strategy, classroom activity, market analysis, product update}} in a {{editorial, academic, executive, playful, premium}} style.",
    variables: ["Document type", "Topic", "Reader", "Editorial style", "Format"],
    outcomes: [
      "Turn document briefs into multiple visual layout directions.",
      "Generate cover and page concepts for reports, lessons, and publications.",
      "Create repeatable prompt systems for content-heavy teams.",
    ],
    faq: [
      {
        question: "Can BatchlyAI generate document layout concepts?",
        answer:
          "Yes. BatchlyAI can create batches of publication, report, worksheet, and slide visual concepts from structured variables.",
      },
      {
        question: "Are generated document images editable files?",
        answer:
          "No. They are visual concepts. Use them to guide layout direction before recreating final assets in design or document tools.",
      },
    ],
  },
];

export function getExamplePage(slug: string): ExamplePage | undefined {
  return examplePages.find((page) => page.slug === slug);
}
