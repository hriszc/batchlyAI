import { env } from "@/env/server";
import { CONTENT_SAFETY_BLOCK_MESSAGE } from "@/lib/content-safety";

const AI_GATEWAY =
  "https://gateway.ai.cloudflare.com/v1/b06ef09426453ac00c27f343d05a0a23/ai-draw-guess";
const REPLICATE_MODEL_PREDICTIONS = "https://api.replicate.com/v1/models";
const NSFW_MODEL = "falcons-ai/nsfw_image_detection";

export { CONTENT_SAFETY_BLOCK_MESSAGE };

export interface NsfwDetectionResult {
  isNsfw: boolean;
  label: string;
}

export type NsfwDetector = (imageUrl: string) => Promise<NsfwDetectionResult>;

interface ReplicateDetectionPrediction {
  status?: string;
  output?: unknown;
  error?: string;
}

function toAbsoluteImageUrl(imageUrl: string): string {
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) return imageUrl;
  return new URL(imageUrl, env.VITE_BASE_URL).toString();
}

function normalizeDetectionOutput(output: unknown): string {
  if (typeof output === "string") return output.trim().toLowerCase();
  if (Array.isArray(output)) return normalizeDetectionOutput(output[0]);
  if (output && typeof output === "object") {
    const record = output as Record<string, unknown>;
    return normalizeDetectionOutput(record.label ?? record.class ?? record.result ?? record.output);
  }
  return "";
}

function shouldModerateImageUrl(imageUrl: string): boolean {
  const pathname = (() => {
    try {
      return new URL(toAbsoluteImageUrl(imageUrl)).pathname.toLowerCase();
    } catch {
      return imageUrl.toLowerCase();
    }
  })();
  return !/\.(mp4|webm|mov|m4v|avi)(\?|$)/.test(pathname);
}

async function createDetectionPrediction(imageUrl: string): Promise<ReplicateDetectionPrediction> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Prefer: "wait",
  };
  if (env.REPLICATE_API_KEY) headers.Authorization = `Bearer ${env.REPLICATE_API_KEY}`;

  const init: RequestInit = {
    method: "POST",
    headers,
    body: JSON.stringify({
      input: { image: toAbsoluteImageUrl(imageUrl) },
    }),
  };

  const gatewayUrl = `${AI_GATEWAY}/replicate/v1/models/${NSFW_MODEL}/predictions`;
  const directUrl = `${REPLICATE_MODEL_PREDICTIONS}/${NSFW_MODEL}/predictions`;
  const resp = await fetch(gatewayUrl, init).catch(() => fetch(directUrl, init));
  if (!resp.ok) {
    const directResp = resp.url === directUrl ? resp : await fetch(directUrl, init);
    if (!directResp.ok) {
      throw new Error(`NSFW detection failed: ${directResp.status}`);
    }
    return (await directResp.json()) as ReplicateDetectionPrediction;
  }

  return (await resp.json()) as ReplicateDetectionPrediction;
}

export async function detectNsfwImage(imageUrl: string): Promise<NsfwDetectionResult> {
  const prediction = await createDetectionPrediction(imageUrl);
  if (prediction.error) {
    throw new Error(`NSFW detection failed: ${prediction.error}`);
  }

  const label = normalizeDetectionOutput(prediction.output);
  if (!label) {
    throw new Error(`NSFW detection did not return a label for status ${prediction.status}`);
  }

  return { isNsfw: label === "nsfw", label };
}

export async function filterSafeImageUrls(
  urls: string[],
  detector: NsfwDetector = detectNsfwImage,
): Promise<{ safeUrls: string[]; blockedUrls: string[] }> {
  const results = await Promise.all(
    urls.map(async (url) => {
      if (!shouldModerateImageUrl(url)) return { url, safe: true };
      try {
        const result = await detector(url);
        return { url, safe: !result.isNsfw };
      } catch (err) {
        console.warn("[nsfw] Detection failed; blocking image:", err);
        return { url, safe: false };
      }
    }),
  );

  return {
    safeUrls: results.filter((result) => result.safe).map((result) => result.url),
    blockedUrls: results.filter((result) => !result.safe).map((result) => result.url),
  };
}

export async function assertImageUrlsSafe(
  urls: string[],
  detector: NsfwDetector = detectNsfwImage,
): Promise<void> {
  if (urls.length === 0) return;
  const { blockedUrls } = await filterSafeImageUrls(urls, detector);
  if (blockedUrls.length > 0) {
    throw new Error(CONTENT_SAFETY_BLOCK_MESSAGE);
  }
}
