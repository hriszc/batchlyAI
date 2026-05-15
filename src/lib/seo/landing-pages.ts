export interface SeoUseCase {
  title: string;
  description: string;
}

export interface SeoLandingPage {
  slug: string;
  title: string;
  h1: string;
  description: string;
  mediaType: "image" | "video" | "both";
  templateSearch: string;
  primaryUseCases: SeoUseCase[];
  promptAngles: string[];
  examples: string[];
  faqs: { question: string; answer: string }[];
}

export const seoLandingPages: SeoLandingPage[] = [
  {
    slug: "batch-prompt-generator",
    title: "Batch Prompt Generator for AI Images and Videos - BatchlyAI",
    h1: "Batch prompt generator for AI images and videos",
    description:
      "Turn one prompt template into every variable combination, then generate AI images or videos in one batch.",
    mediaType: "both",
    templateSearch: "batch prompt",
    primaryUseCases: [
      {
        title: "Prompt variation testing",
        description: "Compare products, styles, scenes, and formats from one reusable prompt.",
      },
      {
        title: "Creative exploration",
        description: "Generate many visual directions before choosing the best concept to refine.",
      },
      {
        title: "Reusable templates",
        description: "Save prompt structures that can be reused across image and video campaigns.",
      },
    ],
    promptAngles: ["product", "style", "background", "camera angle", "format", "audience"],
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
    title: "AI Prompt Variation Generator - BatchlyAI",
    h1: "AI prompt variation generator",
    description:
      "Create every combination from prompt variables like product, style, scene, audience, and format.",
    mediaType: "both",
    templateSearch: "variation",
    primaryUseCases: [
      {
        title: "A/B testing",
        description: "Run several prompt directions side by side before investing in one concept.",
      },
      {
        title: "Style exploration",
        description:
          "Compare lighting, color, composition, and tone while keeping the subject stable.",
      },
      {
        title: "Prompt engineering",
        description: "Find the variables that consistently improve AI image and video outputs.",
      },
    ],
    promptAngles: ["tone", "visual style", "scene", "audience", "layout", "output format"],
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
    title: "AI Product Image and Video Generator - BatchlyAI",
    h1: "AI product image and video generator",
    description:
      "Batch-generate product photos, short product videos, and ecommerce creative variations from reusable prompts.",
    mediaType: "both",
    templateSearch: "product",
    primaryUseCases: [
      {
        title: "Ecommerce product visuals",
        description: "Generate product photos across studio, lifestyle, and seasonal scenes.",
      },
      {
        title: "Shopify listings",
        description: "Test hero images, detail shots, and merchandising angles before publishing.",
      },
      {
        title: "Amazon creative tests",
        description: "Compare clean backgrounds, benefit-led scenes, and use-case images quickly.",
      },
    ],
    promptAngles: ["product", "background", "lighting", "angle", "season", "use case"],
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
    title: "AI Social Media Image and Video Generator - BatchlyAI",
    h1: "AI social media image and video generator",
    description:
      "Create batches of social covers, carousel visuals, short video concepts, and thumbnail variations.",
    mediaType: "both",
    templateSearch: "social",
    primaryUseCases: [
      {
        title: "Short-form video concepts",
        description: "Generate hooks, scenes, and thumbnail directions before editing a post.",
      },
      {
        title: "Social covers",
        description: "Compare cover art concepts for posts, reels, carousels, and launch updates.",
      },
      {
        title: "Carousel visuals",
        description: "Create consistent image directions across multiple slides or topics.",
      },
    ],
    promptAngles: ["platform", "hook", "topic", "format", "audience", "visual style"],
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
    title: "AI Ad Creative Generator for Images and Videos - BatchlyAI",
    h1: "AI ad creative generator for images and videos",
    description:
      "Batch-generate paid social ad image and video variations for offers, audiences, visual hooks, and styles.",
    mediaType: "both",
    templateSearch: "ad creative",
    primaryUseCases: [
      {
        title: "Paid social tests",
        description: "Generate multiple visual hooks for Meta, TikTok, YouTube, and display ads.",
      },
      {
        title: "Creative iteration",
        description: "Compare offer framing, audience angle, and visual composition in one run.",
      },
      {
        title: "Offer visualization",
        description: "Turn a campaign offer into several image or video directions for review.",
      },
    ],
    promptAngles: ["offer", "audience", "visual hook", "layout", "product", "format"],
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
  {
    slug: "ai-anniversary-image-generator",
    title: "AI Anniversary Image Generator - BatchlyAI",
    h1: "AI anniversary image generator",
    description:
      "Create batches of happy anniversary images, romantic greeting visuals, and personalized celebration concepts from reusable prompts.",
    mediaType: "image",
    templateSearch: "anniversary",
    primaryUseCases: [
      {
        title: "Happy anniversary images",
        description: "Generate romantic, elegant, playful, or premium greeting image directions.",
      },
      {
        title: "Couple celebration visuals",
        description: "Compare scenes for cards, posts, invitations, and short campaign assets.",
      },
      {
        title: "Personalized prompt batches",
        description: "Vary names, years, locations, color palettes, and message tone at scale.",
      },
    ],
    promptAngles: ["relationship", "year", "message tone", "color palette", "setting", "format"],
    examples: [
      "Generate anniversary card concepts in romantic, modern, and minimalist styles",
      "Create social post visuals for a couple, brand, or venue anniversary",
      "Test floral, candlelight, city, and beach backgrounds in one batch",
    ],
    faqs: [
      {
        question: "Can I make happy anniversary images with BatchlyAI?",
        answer:
          "Yes. BatchlyAI can batch-generate anniversary image concepts by varying style, message tone, setting, colors, and format.",
      },
      {
        question: "Can I create multiple anniversary card styles at once?",
        answer:
          "Yes. Use prompt variables for card style, color palette, background, and wording direction to compare many options.",
      },
      {
        question: "Who is this anniversary image generator for?",
        answer:
          "It is useful for creators, event teams, greeting card sellers, venues, and brands that need many celebration visual directions.",
      },
    ],
  },
  {
    slug: "ai-engagement-photo-ideas",
    title: "AI Engagement Photo Ideas Generator - BatchlyAI",
    h1: "AI engagement photo ideas generator",
    description:
      "Generate engagement photo concepts, couple pose ideas, location themes, and moodboard visuals before a shoot.",
    mediaType: "image",
    templateSearch: "engagement",
    primaryUseCases: [
      {
        title: "Engagement photo inspiration",
        description:
          "Explore indoor, outdoor, editorial, candid, and cinematic couple photo ideas.",
      },
      {
        title: "Photoshoot moodboards",
        description: "Create visual directions to align couples, photographers, and planners.",
      },
      {
        title: "Location and styling tests",
        description:
          "Compare outfits, poses, lighting, season, and venue direction before the shoot.",
      },
    ],
    promptAngles: ["location", "season", "pose", "wardrobe", "lighting", "mood"],
    examples: [
      "Compare garden, city rooftop, beach, and studio engagement photo concepts",
      "Generate editorial, candid, vintage, and cinematic couple moodboards",
      "Create pose and lighting directions for a photographer's pre-shoot plan",
    ],
    faqs: [
      {
        question: "Can BatchlyAI generate engagement photo ideas?",
        answer:
          "Yes. BatchlyAI can generate batches of engagement photo concepts by varying location, pose, lighting, wardrobe, and mood.",
      },
      {
        question: "Is this a replacement for a photographer?",
        answer:
          "No. It is best used for planning, moodboards, and creative direction before working with a photographer.",
      },
      {
        question: "Can I create engagement photoshoot moodboards?",
        answer:
          "Yes. BatchlyAI can generate multiple visual concepts that help define the shoot style and setting.",
      },
    ],
  },
  {
    slug: "ai-nail-design-generator",
    title: "AI Nail Design Generator - BatchlyAI",
    h1: "AI nail design generator for french tips and short nails",
    description:
      "Batch-generate french tip nails, short nail designs, builder gel concepts, and seasonal manicure ideas.",
    mediaType: "image",
    templateSearch: "nails",
    primaryUseCases: [
      {
        title: "French tip nails",
        description: "Compare classic, chrome, micro, colorful, and seasonal french tip styles.",
      },
      {
        title: "Short nail designs",
        description: "Generate practical manicure ideas that work on short natural nail shapes.",
      },
      {
        title: "Builder gel concepts",
        description:
          "Explore structured gel looks, colorways, finishes, and salon-ready references.",
      },
    ],
    promptAngles: ["nail shape", "length", "color", "finish", "season", "accent detail"],
    examples: [
      "Generate 30 french tip nail directions across color, finish, and shape",
      "Create short nail design ideas for minimal, glossy, and seasonal looks",
      "Test builder gel manicure concepts before creating salon reference boards",
    ],
    faqs: [
      {
        question: "Can BatchlyAI make french tip nail ideas?",
        answer:
          "Yes. BatchlyAI can generate french tip nail image concepts with variables for color, length, finish, and accent detail.",
      },
      {
        question: "Can I generate short nail designs?",
        answer:
          "Yes. You can create short nail design batches for square, almond, round, and natural nail shapes.",
      },
      {
        question: "Is this useful for nail salons?",
        answer:
          "Yes. Salons and creators can use generated nail concepts as inspiration boards and client consultation references.",
      },
    ],
  },
  {
    slug: "ai-hair-color-ideas",
    title: "AI Hair Color Ideas Generator - BatchlyAI",
    h1: "AI hair color ideas generator",
    description:
      "Create batches of hair color ideas, blonde hair colors, semi permanent color looks, and salon moodboard concepts.",
    mediaType: "image",
    templateSearch: "hair color",
    primaryUseCases: [
      {
        title: "Hair color ideas",
        description:
          "Compare brunette, blonde, copper, pastel, vivid, and natural color directions.",
      },
      {
        title: "Blonde hair colors",
        description:
          "Generate warm blonde, ash blonde, honey blonde, beige blonde, and balayage ideas.",
      },
      {
        title: "Semi permanent color concepts",
        description: "Preview temporary color directions for campaigns, creators, or salon boards.",
      },
    ],
    promptAngles: ["base color", "undertone", "placement", "hair length", "lighting", "finish"],
    examples: [
      "Generate blonde hair color moodboards across warm, cool, and neutral tones",
      "Compare balayage, money piece, gloss, and all-over color concepts",
      "Create semi permanent hair color ideas for seasonal content campaigns",
    ],
    faqs: [
      {
        question: "Can BatchlyAI generate hair color ideas?",
        answer:
          "Yes. BatchlyAI can batch-generate hair color concept images by varying color family, undertone, placement, length, and lighting.",
      },
      {
        question: "Can I create blonde hair color inspiration?",
        answer:
          "Yes. Use variables for blonde tone, technique, hair length, and lighting to generate many blonde color directions.",
      },
      {
        question: "Is this professional hair advice?",
        answer:
          "No. These images are creative inspiration; a stylist should advise on what is achievable for a specific client.",
      },
    ],
  },
  {
    slug: "seasonal-color-palette-generator",
    title: "Seasonal Color Palette Generator - BatchlyAI",
    h1: "Seasonal color palette generator for soft autumn and soft summer",
    description:
      "Generate soft autumn color palette, soft summer palette, brand moodboard, fashion, and beauty visual directions.",
    mediaType: "image",
    templateSearch: "color palette",
    primaryUseCases: [
      {
        title: "Soft autumn color palettes",
        description:
          "Create warm muted palettes for fashion, beauty, product styling, and branding.",
      },
      {
        title: "Soft summer color palettes",
        description:
          "Generate cool muted palettes with dusty, gentle, and low-contrast visual systems.",
      },
      {
        title: "Brand and content moodboards",
        description:
          "Turn palette directions into images for campaigns, posts, and product concepts.",
      },
    ],
    promptAngles: ["season", "undertone", "contrast", "color family", "use case", "visual style"],
    examples: [
      "Generate soft autumn palettes for skincare, fashion, and ecommerce visuals",
      "Create soft summer moodboards for editorial, social, and product campaigns",
      "Compare muted neutral, rose, sage, denim, and taupe palette directions",
    ],
    faqs: [
      {
        question: "Can BatchlyAI generate soft autumn color palettes?",
        answer:
          "Yes. BatchlyAI can generate soft autumn visual concepts by varying warmth, contrast, product category, and styling direction.",
      },
      {
        question: "Can I make soft summer palette moodboards?",
        answer:
          "Yes. Use soft summer variables for cool muted colors, texture, subject, and use case to create moodboard images.",
      },
      {
        question: "Can I use this for brand visuals?",
        answer:
          "Yes. Palette pages work well for brand moodboards, product styling, social posts, and campaign concepting.",
      },
    ],
  },
  {
    slug: "ai-coloring-page-generator",
    title: "AI Coloring Page Generator - BatchlyAI",
    h1: "AI coloring page generator for printable patterns",
    description:
      "Create printable coloring pages, adult coloring book concepts, zentangle-inspired patterns, and line art prompt batches.",
    mediaType: "image",
    templateSearch: "coloring page",
    primaryUseCases: [
      {
        title: "Adult coloring books",
        description:
          "Generate intricate floral, geometric, botanical, and relaxation-focused line art ideas.",
      },
      {
        title: "Zentangle-inspired patterns",
        description:
          "Explore repeatable abstract pattern directions without relying on copyrighted characters.",
      },
      {
        title: "Printable activity pages",
        description:
          "Create simple or detailed coloring concepts for classrooms, shops, and content bundles.",
      },
    ],
    promptAngles: ["subject", "line weight", "complexity", "pattern style", "theme", "page format"],
    examples: [
      "Generate printable floral coloring page concepts in simple, medium, and detailed styles",
      "Create zentangle-inspired pattern sheets for adult coloring books",
      "Compare animal, botanical, geometric, and seasonal line art directions",
    ],
    faqs: [
      {
        question: "Can BatchlyAI create coloring pages?",
        answer:
          "Yes. BatchlyAI can generate coloring page concept images by varying subject, complexity, line style, and theme.",
      },
      {
        question: "Can I generate branded character coloring pages?",
        answer:
          "BatchlyAI is better suited for original coloring page ideas and should not be used to copy protected characters or brands.",
      },
      {
        question: "Can I make adult coloring book concepts?",
        answer:
          "Yes. You can create batches of detailed line art, geometric patterns, floral pages, and relaxation-focused coloring concepts.",
      },
    ],
  },
  {
    slug: "ai-video-creative-ideas",
    title: "AI Video Creative Ideas Generator - BatchlyAI",
    h1: "Video editing tips and AI creative ideas generator",
    description:
      "Generate video hook ideas, thumbnail concepts, scene variations, and editing directions for social, ads, and creator workflows.",
    mediaType: "video",
    templateSearch: "video",
    primaryUseCases: [
      {
        title: "Video editing tips",
        description:
          "Turn editing advice into concrete hooks, shot lists, thumbnails, and scene variations.",
      },
      {
        title: "Short-form video ideation",
        description:
          "Create opening hooks, transitions, visual beats, and cover concepts in batches.",
      },
      {
        title: "Creator workflow planning",
        description:
          "Compare multiple visual directions before filming, editing, or generating assets.",
      },
    ],
    promptAngles: ["hook", "platform", "pace", "scene", "thumbnail", "call to action"],
    examples: [
      "Generate 20 hook and thumbnail concepts for one video topic",
      "Compare editing directions for educational, product, and storytelling videos",
      "Create scene-by-scene visual concepts before editing a short-form post",
    ],
    faqs: [
      {
        question: "Can BatchlyAI help with video editing tips?",
        answer:
          "Yes. BatchlyAI can turn video editing tips into batches of visual hooks, scene ideas, thumbnail concepts, and creative directions.",
      },
      {
        question: "Can I generate short-form video ideas?",
        answer:
          "Yes. Use variables for platform, hook, pace, scene, and call to action to create many short-form video concepts.",
      },
      {
        question: "Does BatchlyAI edit finished videos?",
        answer:
          "BatchlyAI focuses on generating creative image and video concepts from prompts, not timeline editing of finished footage.",
      },
    ],
  },
];

export function getSeoLandingPage(slug: string): SeoLandingPage | undefined {
  return seoLandingPages.find((page) => page.slug === slug);
}
