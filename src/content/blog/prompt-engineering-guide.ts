import type { BlogPost } from "./index";

export const promptEngineeringGuide: BlogPost = {
  slug: "prompt-engineering-for-batch-generation",
  title: "Prompt Engineering for Batch AI Generation: Best Practices",
  description:
    "Master the art of writing effective multi-variable prompts for batch AI generation. Tips, tricks, and examples for better results.",
  date: "2026-05-03",
  author: "BatchlyAI Team",
  tags: ["tutorial", "prompt-engineering"],
  content: `Writing good prompts is both art and science. When you add batch generation with multiple variables into the mix, there's an extra layer of complexity. This guide covers best practices for writing effective multi-variable prompts.

## 1. Structure Your Variables Thoughtfully

Variables are the heart of batch generation. Each variable group creates a new dimension in your output space.

**Good structure:**
\`A {{modern, vintage, minimalist}} {{sofa, armchair}} in a {{living room, studio, loft}}\`

This creates 3 × 2 × 3 = 18 combinations covering style, object, and setting.

**Bad structure:**
\`A {{modern sofa, vintage armchair, minimalist living room}}\`

This creates only 3 combinations with mixed concepts. Keep variables at the same level of abstraction.

## 2. Use Descriptive Variable Names

While BatchlyAI auto-names variables as Var 1, Var 2, etc., think of them conceptually:
- Var 1 = "Style"
- Var 2 = "Subject"
- Var 3 = "Setting"

This mental model helps you keep variables organized.

## 3. Balance Combination Count

The total number of combinations = product of all variable counts. With quantity > 1, it multiplies further.

- 2 variables × 3 values = 6 combinations (manageable)
- 3 variables × 4 values = 64 combinations (large but fine)
- 4 variables × 5 values = 625 combinations (very large, consider reducing)

Each combination consumes credits. Be intentional about which combinations you really need.

## 4. Control Quality with Settings

- **Aspect Ratio**: Match your output ratio to the intended use (1:1 for social, 9:16 for stories, 16:9 for video)
- **Quality**: Use "Pro" models when quality matters, "Fast" models for exploration
- **Quantity**: Set to 1 for exploration, 2+ when you need multiple takes

## 5. Start Small, Then Scale

The best batch generation workflow:

1. Start with 2-3 values per variable
2. Review results for quality
3. Refine your prompt and variable values
4. Scale up to larger batches once you're happy with the output

## 6. Cache Your Best Prompts

BatchlyAI caches generation results for 24 hours. If you run the same prompt with the same settings, you get instant results with no credit cost. This makes iteration fast and cost-effective.

## Common Mistakes to Avoid

- Using too many values in a single variable group (makes combinations explode)
- Mixing incompatible concepts (e.g., "cat, car, cloud" — different categories)
- Not reviewing the estimated cost before generating
- Forgetting that variable values are case-sensitive

Happy batch generating!`,
};
