import { CREDIT_COST } from "@/lib/generator-credits";

export interface ModelInfo {
  id: string;
  label: string;
  category: "image" | "video" | "text";
  tier: "fast" | "pro";
  provider: "replicate" | "grsai" | "deepseek" | "simulated";
  providerModel: string;
  /** Credits per unit (per image, per generation, per second of video) */
  creditCost: number;
}

export const MODELS: ModelInfo[] = [
  {
    id: "z-image-fast",
    label: "Image Turbo",
    category: "image",
    tier: "fast",
    provider: "replicate",
    providerModel: "cba7f388939b0db49dbea3341f8d732577aa0a964d9eefea5d186ab47e60deba",
    creditCost: CREDIT_COST["z-image-fast"],
  },
  {
    id: "z-image-pro",
    label: "Image Pro",
    category: "image",
    tier: "pro",
    provider: "grsai",
    providerModel: "gpt-image-2",
    creditCost: CREDIT_COST["z-image-pro"],
  },
  {
    id: "z-video-fast",
    label: "Video Turbo",
    category: "video",
    tier: "fast",
    provider: "replicate",
    providerModel: "prunaai/p-video",
    creditCost: CREDIT_COST["z-video-fast"],
  },
  {
    id: "z-video-pro",
    label: "Video Pro",
    category: "video",
    tier: "pro",
    provider: "replicate",
    providerModel: "alibaba/happyhorse-1.0",
    creditCost: CREDIT_COST["z-video-pro"],
  },
  {
    id: "z-text-fast",
    label: "Text Turbo",
    category: "text",
    tier: "fast",
    provider: "deepseek",
    providerModel: "deepseek-v4-flash",
    creditCost: CREDIT_COST["z-text-fast"],
  },
  {
    id: "z-text-pro",
    label: "Text Pro",
    category: "text",
    tier: "pro",
    provider: "deepseek",
    providerModel: "deepseek-v4-pro",
    creditCost: CREDIT_COST["z-text-pro"],
  },
];

export const MODEL_CATEGORIES: { key: ModelInfo["category"]; label: string; labelZh: string }[] = [
  { key: "image", label: "Image", labelZh: "生图" },
  { key: "video", label: "Video", labelZh: "生视频" },
  { key: "text", label: "Text", labelZh: "生文" },
];

export const DEFAULT_MODEL = "z-image-pro";
