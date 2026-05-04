import { env } from "@/env/server";

interface ImageGenerationParams {
  prompt: string;
  aspectRatio?: string;
  n?: number;
  model?: string;
}

// grsaiapi (gpt-image-2, pro tier)
interface DrawApiResponse {
  code: number;
  data: { results: { url: string }[] };
  msg: string;
}

const DRAW_API_HOST = "https://grsaiapi.com/v1/draw/completions";

async function generateWithGrsai({
  prompt,
  aspectRatio = "1:1",
  n = 1,
}: ImageGenerationParams): Promise<string[]> {
  const requests = Array.from({ length: n }, () =>
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
        webHook: "",
        shutProgress: false,
      }),
    }).then(async (resp) => {
      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`grsai API error ${resp.status}: ${errText}`);
      }
      const json = (await resp.json()) as DrawApiResponse;
      if (json.code !== 0 || !json.data?.results?.length) {
        throw new Error(`grsai API error: ${json.msg || "No results"}`);
      }
      return json.data.results.map((r) => r.url);
    }),
  );

  const resultGroups = await Promise.all(requests);
  return resultGroups.flat();
}

// Replicate (prunaai/z-image-turbo, fast tier)
interface ReplicatePrediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string[];
  error?: string;
  urls: { get: string; cancel: string };
}

async function generateWithReplicate({
  prompt,
  aspectRatio = "1:1",
  n = 1,
}: ImageGenerationParams): Promise<string[]> {
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
        return (await resp.json()) as ReplicatePrediction;
      }),
    ),
  );

  const results = await Promise.all(
    predictions.map(async (pred) => {
      let current = pred;
      while (current.status !== "succeeded" && current.status !== "failed" && current.status !== "canceled") {
        await new Promise((r) => setTimeout(r, 500));
        const pollResp = await fetch(current.urls.get, {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (!pollResp.ok) {
          throw new Error(`Replicate poll error ${pollResp.status}`);
        }
        current = (await pollResp.json()) as ReplicatePrediction;
      }

      if (current.status !== "succeeded" || !current.output?.length) {
        console.error("[replicate] Prediction failed:", current.error);
        return [];
      }
      return current.output;
    }),
  );

  return results.flat();
}

export async function generateImage(params: ImageGenerationParams): Promise<string[]> {
  const model = params.model || "";

  if (model === "z-image-fast") {
    return generateWithReplicate(params);
  }
  return generateWithGrsai(params);
}

// Async helpers for Replicate
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
    return { status: prediction.status, urls: null, error: prediction.error || "Prediction failed" };
  }
  return { status: prediction.status, urls: null, error: null };
}
