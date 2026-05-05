import { env } from "@/env/server";

interface ImageGenerationParams {
  prompt: string;
  aspectRatio?: string;
  n?: number;
  model?: string;
}

const DRAW_API_HOST = "https://grsaiapi.com/v1/draw/completions";

export interface GrsaiCreateResult {
  id: string;
  status: string;
}

export async function createGrsaiPredictions({
  prompt,
  aspectRatio = "1:1",
  n = 1,
}: ImageGenerationParams): Promise<GrsaiCreateResult[]> {
  const predictions = await Promise.all(
    Array.from({ length: n }, () =>
      fetch(DRAW_API_HOST, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.GRSAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-image-2",
          prompt,
          aspectRatio,
          urls: [],
          webHook: `${env.VITE_BASE_URL}/api/grs-webhook`,
        }),
      }).then(async (resp) => {
        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(`grsai API error ${resp.status}: ${errText}`);
        }
        const data = (await resp.json()) as {
          code: number;
          data: { id: string };
          msg: string;
        };
        if (data.code !== 0 || !data.data?.id) {
          throw new Error(`grsai API unexpected response: ${JSON.stringify(data)}`);
        }
        return { id: data.data.id, status: "processing" };
      }),
    ),
  );

  return predictions;
}

// Async helpers for Replicate
interface ReplicatePrediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string[];
  error?: string;
  urls: { get: string; cancel: string };
}

interface ReplicateCreateResult {
  id: string;
  status: string;
  urls: { get: string; cancel: string };
}

export async function createReplicatePredictions({
  prompt,
  aspectRatio = "1:1",
  n = 1,
}: ImageGenerationParams): Promise<ReplicateCreateResult[]> {
  const key = env.REPLICATE_API_KEY;
  if (!key) throw new Error("REPLICATE_API_KEY is not configured");

  const [w, h] = aspectRatio.split(":").map(Number);
  const baseSize = 1024;
  let width = baseSize;
  let height = baseSize;
  if (w && h) {
    if (w >= h) {
      width = baseSize;
      height = Math.round(baseSize * (h / w));
    } else {
      height = baseSize;
      width = Math.round(baseSize * (w / h));
    }
  }

  const predictions = await Promise.all(
    Array.from({ length: n }, () =>
      fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          version: "cba7f388939b0db49dbea3341f8d732577aa0a964d9eefea5d186ab47e60deba",
          input: {
            prompt,
            width,
            height,
            num_outputs: 1,
          },
        }),
      }).then(async (resp) => {
        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(`Replicate API error ${resp.status}: ${errText}`);
        }
        return (await resp.json()) as ReplicateCreateResult;
      }),
    ),
  );

  return predictions;
}

interface PollResult {
  status: string;
  urls: string[] | null;
  error: string | null;
}

export async function pollReplicatePrediction(predictionId: string): Promise<PollResult> {
  const key = env.REPLICATE_API_KEY;
  if (!key) throw new Error("REPLICATE_API_KEY is not configured");

  const resp = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
    headers: { Authorization: `Bearer ${key}` },
  });

  if (!resp.ok) {
    throw new Error(`Replicate poll error ${resp.status}`);
  }

  const prediction = (await resp.json()) as ReplicatePrediction;

  if (prediction.status === "succeeded") {
    return { status: "succeeded", urls: prediction.output || [], error: null };
  }
  if (prediction.status === "failed" || prediction.status === "canceled") {
    return {
      status: prediction.status,
      urls: null,
      error: prediction.error || "Prediction failed",
    };
  }
  return { status: prediction.status, urls: null, error: null };
}
