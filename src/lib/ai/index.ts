import { env } from "@/env/server";

interface ImageGenerationParams {
  prompt: string;
  aspectRatio?: string;
  n?: number;
  model?: string;
}

// Cloudflare AI Gateway — all AI API calls route through here for caching, retries, analytics
const AI_GATEWAY =
  "https://gateway.ai.cloudflare.com/v1/b06ef09426453ac00c27f343d05a0a23/batchlyai-gateway";
const DEEPSEEK_HOST = `${AI_GATEWAY}/deepseek/v1/chat/completions`;
const REPLICATE_API_BASE = `${AI_GATEWAY}/replicate`;
const DRAW_API_HOST = "https://grsaiapi.com/v1/draw/completions"; // GRS AI: custom provider, not in gateway yet

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

const REPLICATE_MODEL_VERSIONS: Record<string, string> = {
  "z-image-fast": "cba7f388939b0db49dbea3341f8d732577aa0a964d9eefea5d186ab47e60deba",
  "z-video-fast": "prunaai/p-video",
  "z-video-pro": "alibaba/happyhorse-1.0",
};

export async function createReplicatePredictions({
  prompt,
  aspectRatio = "1:1",
  n = 1,
  model,
}: ImageGenerationParams): Promise<ReplicateCreateResult[]> {
  const version =
    (model ? REPLICATE_MODEL_VERSIONS[model] : null) ?? REPLICATE_MODEL_VERSIONS["z-image-fast"];
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
      fetch(`${REPLICATE_API_BASE}/v1/predictions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          version,
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

  const resp = await fetch(`${REPLICATE_API_BASE}/v1/predictions/${predictionId}`, {
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

function getDeepseekKey(): string {
  const key = env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("DEEPSEEK_API_KEY is not configured");
  return key;
}

async function chatDeepseek(
  messages: Array<{ role: string; content: string }>,
  opts?: { maxTokens?: number; temperature?: number; model?: string },
): Promise<string> {
  const key = getDeepseekKey();
  const resp = await fetch(DEEPSEEK_HOST, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: opts?.model ?? "deepseek-chat",
      max_tokens: opts?.maxTokens ?? 256,
      temperature: opts?.temperature ?? 0.7,
      messages,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`DeepSeek API error ${resp.status}: ${errText}`);
  }

  const data = (await resp.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0]?.message?.content?.trim() ?? "";
}

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
  const text = await chatDeepseek(
    [
      { role: "system", content: EXPAND_SYSTEM_PROMPT },
      { role: "user", content: description },
    ],
    { maxTokens: 100, temperature: 0.7, model: "deepseek-chat" },
  );

  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface TextGenerationParams {
  prompt: string;
  model?: string;
}

export async function generateText({ prompt, model }: TextGenerationParams): Promise<string> {
  return chatDeepseek([{ role: "user", content: prompt }], {
    model: model ?? "deepseek-chat",
    maxTokens: 2048,
    temperature: 0.8,
  });
}
