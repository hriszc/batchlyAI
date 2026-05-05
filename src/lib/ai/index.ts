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
          webHook: `${env.VITE_BASE_URL}/api/grs-webhook${env.GRS_WEBHOOK_SECRET ? `?secret=${env.GRS_WEBHOOK_SECRET}` : ""}`,
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

// All image generation uses async prediction flow (create + poll via webhook/status endpoint).
// Server-side busy-wait polling is incompatible with Cloudflare Workers CPU/timeout limits.
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

const ANTHROPIC_HOST = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

const EXPAND_SYSTEM_PROMPT =
  "You are a variable expander for an AI image generator. " +
  "Given a natural language description, output 3-8 concrete, diverse, and specific values " +
  "as a comma-separated list on one line. Be creative and varied. Do not include explanations " +
  "or numbering. Output only the comma-separated list.\n\n" +
  "Examples:\n" +
  'User: "three colors"\n' +
  "Assistant: crimson red, sunshine yellow, ocean blue\n" +
  'User: "famous artists"\n' +
  "Assistant: Picasso, Van Gogh, Monet, Dali, Warhol\n" +
  'User: "summer vibes"\n' +
  "Assistant: beach sunset, tropical palm, pool party, ice cream truck";

export async function runExpandLLM(description: string): Promise<string[]> {
  const key = env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not configured");

  const resp = await fetch(ANTHROPIC_HOST, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 100,
      temperature: 0.7,
      system: EXPAND_SYSTEM_PROMPT,
      messages: [{ role: "user", content: description }],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Anthropic API error ${resp.status}: ${errText}`);
  }

  const data = (await resp.json()) as {
    content: Array<{ type: string; text: string }>;
  };
  const text = data.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("")
    .trim();

  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
