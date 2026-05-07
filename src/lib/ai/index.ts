import { env } from "@/env/server";

interface ImageGenerationParams {
  prompt: string;
  aspectRatio?: string;
  n?: number;
  model?: string;
}

// Cloudflare AI Gateway — provides caching, retries, analytics.
// If a gateway provider returns an error, we fall back to the direct API.
const AI_GATEWAY =
  "https://gateway.ai.cloudflare.com/v1/b06ef09426453ac00c27f343d05a0a23/ai-draw-guess";
const DEEPSEEK_DIRECT = "https://api.deepseek.com/v1/chat/completions";
const REPLICATE_DIRECT = "https://api.replicate.com/v1/predictions";
const DRAW_API_DIRECT = "https://grsaiapi.com/v1/draw/completions";

const DEEPSEEK_HOST = `${AI_GATEWAY}/deepseek/v1/chat/completions`;
const REPLICATE_API_BASE = `${AI_GATEWAY}/replicate`;
const DRAW_API_HOST = `${AI_GATEWAY}/custom-grsai/v1/draw/completions`;

/**
 * Try gateway first; fall back to direct API on any failure.
 * This makes all 3 providers resilient to gateway misconfiguration.
 */
async function fetchWithFallback(
  gatewayUrl: string,
  directUrl: string,
  init: RequestInit,
  provider: string,
): Promise<Response> {
  // Try gateway
  try {
    const resp = await fetch(gatewayUrl, init);
    if (resp.ok) return resp;
    const errBody = await resp.text();
    console.warn(
      `[ai] Gateway ${provider} returned ${resp.status}, falling back to direct. Body: ${errBody.slice(0, 500)}`,
    );
    // Clone init with fresh body since we consumed the response
    const fallbackInit = { ...init, body: init.body };
    return fetch(directUrl, fallbackInit);
  } catch (err) {
    console.warn(`[ai] Gateway ${provider} unreachable (${err}), falling back to direct.`);
  }
  // Fall back to direct
  return fetch(directUrl, init);
}

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
      fetchWithFallback(
        DRAW_API_HOST,
        DRAW_API_DIRECT,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(env.GRSAI_API_KEY ? { Authorization: `Bearer ${env.GRSAI_API_KEY}` } : {}),
          },
          body: JSON.stringify({
            model: "gpt-image-2",
            prompt,
            aspectRatio,
            urls: [],
            webHook: `${env.VITE_BASE_URL}/api/grs-webhook`,
          }),
        },
        "grsai",
      ).then(async (resp) => {
        if (!resp.ok) {
          const errText = await resp.text();
          if (resp.status === 401 && env.GRSAI_API_KEY === "dev-key") {
            throw new Error(
              `grsai API error 401: Using dev API key. Set real key via: wrangler secret put GRSAI_API_KEY. Details: ${errText}`,
            );
          }
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

const REPLICATE_MODEL_VERSIONS: Record<string, string> = {
  "z-image-fast": "cba7f388939b0db49dbea3341f8d732577aa0a964d9eefea5d186ab47e60deba",
  "z-video-fast": "prunaai/p-video",
  "z-video-pro": "alibaba/happyhorse-1.0",
};

async function fetchWithRetry(
  url: string,
  directUrl: string,
  init: RequestInit,
  provider: string,
  maxRetries = 4,
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const resp = await fetchWithFallback(url, directUrl, init, provider);
    if (resp.status !== 429 || attempt === maxRetries) return resp;
    const delay = Math.min(1000 * 2 ** attempt, 16000);
    console.warn(
      `[ai] ${provider} 429 throttled, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
    );
    await new Promise((r) => setTimeout(r, delay));
  }
  // unreachable but TS needs it
  return fetchWithFallback(url, directUrl, init, provider);
}

export async function createReplicatePredictions({
  prompt,
  aspectRatio = "1:1",
  n = 1,
  model,
}: ImageGenerationParams): Promise<ReplicateCreateResult[]> {
  const version =
    (model ? REPLICATE_MODEL_VERSIONS[model] : null) ?? REPLICATE_MODEL_VERSIONS["z-image-fast"];
  const key = env.REPLICATE_API_KEY; // optional: Gateway handles auth in managed mode
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (key) headers.Authorization = `Bearer ${key}`;

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

  // Run predictions sequentially to stay within Replicate's burst limit (5 req/s for low-balance accounts)
  const predictions: ReplicateCreateResult[] = [];
  for (let i = 0; i < n; i++) {
    const resp = await fetchWithRetry(
      `${REPLICATE_API_BASE}/v1/predictions`,
      `${REPLICATE_DIRECT}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          version,
          input: { prompt, width, height, num_outputs: 1 },
        }),
      },
      "replicate",
    );
    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Replicate API error ${resp.status}: ${errText}`);
    }
    predictions.push((await resp.json()) as ReplicateCreateResult);
  }

  return predictions;
}

interface PollResult {
  status: string;
  urls: string[] | null;
  error: string | null;
}

export async function pollReplicatePrediction(predictionId: string): Promise<PollResult> {
  const key = env.REPLICATE_API_KEY; // optional: Gateway handles auth in managed mode
  const pollHeaders: Record<string, string> = {};
  if (key) pollHeaders.Authorization = `Bearer ${key}`;

  const resp = await fetchWithFallback(
    `${REPLICATE_API_BASE}/v1/predictions/${predictionId}`,
    `${REPLICATE_DIRECT}/${predictionId}`,
    { headers: pollHeaders },
    "replicate",
  );

  if (!resp.ok) {
    throw new Error(`Replicate poll error ${resp.status}`);
  }

  const prediction = (await resp.json()) as ReplicatePrediction;

  if (prediction.status === "succeeded") {
    const raw = prediction.output;
    const urls = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return { status: "succeeded", urls, error: null };
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

async function chatDeepseek(
  messages: Array<{ role: string; content: string }>,
  opts?: { maxTokens?: number; temperature?: number; model?: string },
): Promise<string> {
  const key = env.DEEPSEEK_API_KEY;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (key) headers.Authorization = `Bearer ${key}`;

  // Try Gateway first, then direct API. If Gateway returns 401, it means
  // the provider isn't configured or the API key is wrong. Check:
  //   https://dash.cloudflare.com/b06ef09426453ac00c27f343d05a0a23/ai/ai-gateway/gateways
  // The provider name in the Gateway must match the URL path (case-sensitive).
  const resp = await fetchWithFallback(
    DEEPSEEK_HOST,
    DEEPSEEK_DIRECT,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: opts?.model ?? "deepseek-v4-flash",
        max_tokens: opts?.maxTokens ?? 256,
        temperature: opts?.temperature ?? 0.7,
        messages,
      }),
    },
    "deepseek",
  );

  if (!resp.ok) {
    const errText = await resp.text();
    if (resp.status === 401 && !key) {
      throw new Error(
        `DeepSeek API error 401: Gateway auth failed and no DEEPSEEK_API_KEY fallback. ` +
          `Set via: wrangler secret put DEEPSEEK_API_KEY. Details: ${errText}`,
      );
    }
    throw new Error(`DeepSeek API error ${resp.status}: ${errText}`);
  }

  const data = (await resp.json()) as {
    choices: Array<{ message: { content: string; reasoning_content?: string } }>;
  };
  const msg = data.choices[0]?.message;
  return (msg?.content || msg?.reasoning_content || "").trim();
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
    { maxTokens: 500, temperature: 0.7, model: "deepseek-v4-flash" },
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
    model: model ?? "deepseek-v4-flash",
    maxTokens: 2048,
    temperature: 0.8,
  });
}
