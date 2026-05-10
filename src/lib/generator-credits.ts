export const CREDIT_COST: Record<string, number> = {
  "z-image-fast": 10,
  "z-image-pro": 20,
  "z-text-fast": 5,
  "z-text-pro": 10,
  "z-video-fast": 40,
  "z-video-pro": 80,
};

export const DEFAULT_GENERATION_CREDIT_COST = 20;
export const DEFAULT_VIDEO_DURATION_SECONDS = 5;

export function calculateGenerationCredits(options: {
  model: string;
  quantity: number;
  durationSeconds?: number;
}): number {
  const { model, quantity, durationSeconds } = options;
  if (quantity <= 0) return 0;

  const costPerUnit = CREDIT_COST[model] ?? DEFAULT_GENERATION_CREDIT_COST;
  const videoMultiplier = model.startsWith("z-video")
    ? (durationSeconds ?? DEFAULT_VIDEO_DURATION_SECONDS)
    : 1;

  return costPerUnit * quantity * videoMultiplier;
}
