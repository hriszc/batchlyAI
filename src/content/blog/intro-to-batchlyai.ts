import type { BlogPost } from "./index";

export const introToBatchlyai: BlogPost = {
  slug: "introducing-batchlyai",
  title: "Introducing BatchlyAI: Batch AI Generation Made Simple",
  description:
    "Learn how BatchlyAI helps creators, designers, and marketers generate hundreds of AI images in seconds using multi-variable prompt templates.",
  date: "2026-05-01",
  author: "BatchlyAI Team",
  tags: ["product", "tutorial"],
  content: `AI image generation has transformed creative workflows. But there's one pain point that remains: generating variations. Whether you're testing different product photo angles, creating character design sheets, or building mood boards, you need to run the same prompt dozens of times with slight variations.

That's why we built BatchlyAI — a tool designed from the ground up for batch AI generation.

## What is BatchlyAI?

BatchlyAI is a universal AI generator that uses multi-variable prompt templates. You write a single prompt with placeholders, and BatchlyAI generates all possible combinations.

For example, the prompt:

\`A {{cat, dog, rabbit}} wearing a {{red, blue, green}} hat in a {{forest, beach, city}}\`

...generates 3 × 3 × 3 = 27 images, one for each combination.

## Key Features

**Multi-Variable Templates**: Use \`{{var1, var2, var3}}\` syntax to define variable groups. BatchlyAI automatically detects them and lets you edit values inline.

**Multiple AI Models**: Choose between fast and pro models for images, with text and video models coming soon. Each model has different quality/speed trade-offs.

**Quantity Control**: Need multiple versions of each combination? Set quantity to 2, 4, or more, and each combination gets multiple generations.

**Credit System**: Start with 10 free credits. Each model has a credit cost (5-80 credits per generation). Buy more credits anytime.

## Getting Started

1. Visit batchlyai.com and create a free account
2. Write your first prompt using \`{{variables}}\`
3. Click Generate and watch your batch come to life
4. Share your results or download individual images

## Use Cases

- **Product Photography**: Generate product shots with different backgrounds, angles, and lighting
- **Character Design**: Create character sheets with different expressions, outfits, and poses
- **Marketing Assets**: Generate social media images, ad variations, and banner designs
- **Creative Exploration**: Explore ideas by combining styles, subjects, and environments

Try it free at batchlyai.com — no credit card required.`,
};
