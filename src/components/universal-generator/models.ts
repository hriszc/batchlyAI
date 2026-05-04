export interface ModelInfo {
  id: string;
  label: string;
  category: "image" | "video" | "text";
  tier: "fast" | "pro";
  provider: "replicate" | "grsai" | "simulated";
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
    creditCost: 10,
  },
  {
    id: "z-image-pro",
    label: "Image Pro",
    category: "image",
    tier: "pro",
    provider: "grsai",
    providerModel: "gpt-image-2",
    creditCost: 20,
  },
  {
    id: "z-video-fast",
    label: "Video Turbo",
    category: "video",
    tier: "fast",
    provider: "simulated",
    providerModel: "",
    creditCost: 40,
  },
  {
    id: "z-video-pro",
    label: "Video Pro",
    category: "video",
    tier: "pro",
    provider: "simulated",
    providerModel: "",
    creditCost: 80,
  },
  {
    id: "z-text-fast",
    label: "Text Turbo",
    category: "text",
    tier: "fast",
    provider: "simulated",
    providerModel: "",
    creditCost: 5,
  },
  {
    id: "z-text-pro",
    label: "Text Pro",
    category: "text",
    tier: "pro",
    provider: "simulated",
    providerModel: "",
    creditCost: 10,
  },
];

export const MODEL_CATEGORIES: { key: ModelInfo["category"]; label: string; labelZh: string }[] = [
  { key: "image", label: "Image", labelZh: "生图" },
  { key: "video", label: "Video", labelZh: "生视频" },
  { key: "text", label: "Text", labelZh: "生文" },
];

export const DEFAULT_MODEL = "z-image-pro";
