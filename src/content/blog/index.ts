export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  tags: string[];
  content: string;
}

import { introToBatchlyai } from "./intro-to-batchlyai";
import { promptEngineeringGuide } from "./prompt-engineering-guide";
import { bestAiImageModels } from "./best-ai-image-models";

export const blogPosts: BlogPost[] = [
  introToBatchlyai,
  promptEngineeringGuide,
  bestAiImageModels,
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}
