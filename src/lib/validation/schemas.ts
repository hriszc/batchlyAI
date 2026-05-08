import { z } from "zod";

export const VALID_MODELS = [
  "z-image-fast",
  "z-image-pro",
  "z-text-fast",
  "z-text-pro",
  "z-video-fast",
  "z-video-pro",
] as const;

export const VALID_ASPECT_RATIOS = ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3"] as const;

export const generateRequestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(5000, "Prompt must be under 5000 characters"),
  aspectRatio: z.enum(VALID_ASPECT_RATIOS).optional().default("1:1"),
  n: z.number().int().min(1).max(10).optional().default(1),
  model: z.enum(VALID_MODELS).optional().default("z-image-pro"),
  promptTemplate: z.string().optional(),
  variableGroups: z.array(z.object({ id: z.string(), values: z.array(z.string()) })).optional(),
  maxTokens: z.number().int().min(64).max(8192).optional(),
  duration: z.number().int().min(1).max(60).optional(),
  promptTemplate: z.string().max(5000).optional(),
  variableGroups: z.array(z.unknown()).optional(),
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;
