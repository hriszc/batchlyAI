import { env } from "@/env/server";

interface ImageGenerationParams {
  prompt: string;
  aspectRatio?: string;
  n?: number;
  model?: string;
  duration?: number;
  urls?: string[];
}

// Cloudflare AI Gateway — provides caching, retries, analytics.
// If a gateway provider returns an error, we fall back to the direct API.
const AI_GATEWAY =
  "https://gateway.ai.cloudflare.com/v1/b06ef09426453ac00c27f343d05a0a23/ai-draw-guess";
const DEEPSEEK_DIRECT = "https://api.deepseek.com/v1/chat/completions";
const REPLICATE_DIRECT = "https://api.replicate.com/v1/predictions";
const DRAW_API_DIRECT = "https://grsaiapi.com/v1/draw/completions";
const DRAW_RESULT_DIRECT = "https://grsaiapi.com/v1/draw/result";

const DEEPSEEK_HOST = `${AI_GATEWAY}/deepseek/v1/chat/completions`;
const REPLICATE_API_BASE = `${AI_GATEWAY}/replicate`;
const DRAW_API_HOST = `${AI_GATEWAY}/custom-grsai/v1/draw/completions`;
const DRAW_RESULT_HOST = `${AI_GATEWAY}/custom-grsai/v1/draw/result`;
const GRS_NO_CACHE_HEADERS = {
  "cf-aig-skip-cache": "true",
  "cf-skip-cache": "true",
};

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
    // Request body is always a JSON string, safe to reuse
    return fetch(directUrl, init);
  } catch (err) {
    console.warn(`[ai] Gateway ${provider} unreachable (${String(err)}), falling back to direct.`);
  }
  // Fall back to direct
  return fetch(directUrl, init);
}

export interface GrsaiCreateResult {
  id: string;
  status: string;
  urls?: string[];
}

export interface GrsaiPollResult {
  status: string;
  urls: string[] | null;
  error: string | null;
}

interface GrsaiTaskPayload {
  id?: string;
  task_id?: string;
  status?: string;
  progress?: number;
  results?: Array<{ url?: string } | string> | null;
  url?: string;
  failure_reason?: string;
  error?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractGrsaiUrls(payload: GrsaiTaskPayload): string[] {
  const urls = new Set<string>();
  if (typeof payload.url === "string" && payload.url) urls.add(payload.url);
  for (const result of payload.results ?? []) {
    if (typeof result === "string" && result) {
      urls.add(result);
    } else if (
      typeof result === "object" &&
      result &&
      typeof result.url === "string" &&
      result.url
    ) {
      urls.add(result.url);
    }
  }
  return [...urls];
}

function normalizeGrsaiPayload(raw: unknown): GrsaiTaskPayload | null {
  if (!isRecord(raw)) return null;

  if (typeof raw.code === "number" && raw.code !== 0) {
    throw new Error(`grsai API unexpected response: ${JSON.stringify(raw)}`);
  }

  const payload = isRecord(raw.data) ? raw.data : raw;
  const id = typeof payload.id === "string" ? payload.id : undefined;
  const taskId = typeof payload.task_id === "string" ? payload.task_id : undefined;
  if (!id && !taskId) return null;

  return payload as GrsaiTaskPayload;
}

function toGrsaiCreateResult(raw: unknown): GrsaiCreateResult | null {
  const payload = normalizeGrsaiPayload(raw);
  if (!payload) return null;

  const id = payload.id || payload.task_id;
  if (!id) return null;

  const error =
    (typeof payload.error === "string" && payload.error) ||
    (typeof payload.failure_reason === "string" && payload.failure_reason) ||
    "";
  if (payload.status === "failed" || error) {
    throw new Error(`grsai API failed: ${error || "Generation failed"}`);
  }

  const urls = extractGrsaiUrls(payload);
  if (payload.progress === 100 && payload.status === "succeeded") {
    if (urls.length > 0) {
      return { id, status: "succeeded", urls };
    }
    throw new Error("grsai API succeeded without image URLs");
  }

  return { id, status: "processing" };
}

function toGrsaiPollResult(raw: unknown): GrsaiPollResult {
  const payload = normalizeGrsaiPayload(raw);
  if (!payload) {
    throw new Error(`grsai API unexpected response: ${JSON.stringify(raw)}`);
  }

  const error =
    (typeof payload.error === "string" && payload.error) ||
    (typeof payload.failure_reason === "string" && payload.failure_reason) ||
    "";
  if (payload.status === "failed" || error) {
    return { status: "failed", urls: null, error: error || "Generation failed" };
  }

  const urls = extractGrsaiUrls(payload);
  if (payload.progress === 100 && payload.status === "succeeded") {
    if (urls.length > 0) return { status: "succeeded", urls, error: null };
    return { status: "failed", urls: null, error: "Generation finished without image URLs" };
  }

  return { status: "processing", urls: null, error: null };
}

async function parseGrsaiCreateResponse(resp: Response): Promise<GrsaiCreateResult> {
  if (!resp.ok) {
    const errText = await resp.text();
    if (resp.status === 401 && env.GRSAI_API_KEY === "dev-key") {
      throw new Error(
        `grsai API error 401: Using dev API key. Set real key via: wrangler secret put GRSAI_API_KEY. Details: ${errText}`,
      );
    }
    throw new Error(`grsai API error ${resp.status}: ${errText}`);
  }

  const raw = await resp.json();
  const result = toGrsaiCreateResult(raw);
  if (!result) {
    throw new Error(`grsai API unexpected response: ${JSON.stringify(raw)}`);
  }
  return result;
}

async function createGrsaiPrediction(init: RequestInit): Promise<GrsaiCreateResult> {
  const resp = await fetchWithFallback(DRAW_API_HOST, DRAW_API_DIRECT, init, "grsai");
  return parseGrsaiCreateResponse(resp);
}

function toGrsaiAspectRatio(aspectRatio: string): string {
  const ratios: Record<string, string> = {
    "1:1": "1024x1024",
    "16:9": "1774x887",
    "9:16": "887x1774",
    "3:2": "1536x1024",
    "2:3": "1024x1536",
    "4:3": "1536x1024",
    "3:4": "1024x1536",
  };
  return ratios[aspectRatio] ?? "1024x1024";
}

export async function createGrsaiPredictions({
  prompt,
  aspectRatio = "1:1",
  n = 1,
  urls,
}: ImageGenerationParams & { urls?: string[] }): Promise<GrsaiCreateResult[]> {
  const init: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...GRS_NO_CACHE_HEADERS,
      ...(env.GRSAI_API_KEY ? { Authorization: `Bearer ${env.GRSAI_API_KEY}` } : {}),
    },
    body: JSON.stringify({
      model: "gpt-image-2",
      prompt,
      aspectRatio: toGrsaiAspectRatio(aspectRatio),
      urls: urls ?? [],
      webHook: `${env.VITE_BASE_URL}/api/grs-webhook`,
    }),
  };

  const predictions = await Promise.all(
    Array.from({ length: n }, () => createGrsaiPrediction(init)),
  );

  return predictions;
}

export async function pollGrsaiResult(id: string): Promise<GrsaiPollResult> {
  const resp = await fetchWithFallback(
    DRAW_RESULT_HOST,
    DRAW_RESULT_DIRECT,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...GRS_NO_CACHE_HEADERS,
        ...(env.GRSAI_API_KEY ? { Authorization: `Bearer ${env.GRSAI_API_KEY}` } : {}),
      },
      body: JSON.stringify({ id }),
    },
    "grsai-result",
  );

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`grsai result API error ${resp.status}: ${errText}`);
  }

  return toGrsaiPollResult(await resp.json());
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
  "z-image-fast-img2img": "5c958e90e0f904240629ee35c69196e3bd790b5528c0696705ebdb1656871dd8",
  "z-video-fast": "prunaai/p-video",
  "z-video-pro": "alibaba/happyhorse-1.0",
};

async function fetchWithRetry(
  url: string,
  directUrl: string,
  init: RequestInit,
  provider: string,
  maxRetries = 5,
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const resp = await fetchWithFallback(url, directUrl, init, provider);
    if (resp.status !== 429 || attempt === maxRetries) return resp;
    // Use the Retry-After header if present, otherwise exponential backoff
    const retryAfter = resp.headers.get("Retry-After");
    let delay: number;
    if (retryAfter) {
      delay = parseInt(retryAfter, 10) * 1000;
    } else {
      // Try to extract retry_after from JSON body
      try {
        const body = await resp.clone().json();
        if (body.retry_after) delay = (body.retry_after as number) * 1000;
        else delay = Math.min(2000 * 2 ** attempt, 30000);
      } catch {
        delay = Math.min(2000 * 2 ** attempt, 30000);
      }
    }
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
  duration,
  urls,
}: ImageGenerationParams): Promise<ReplicateCreateResult[]> {
  const hasReferenceImage = !!urls?.[0];
  const version =
    model === "z-image-fast" && hasReferenceImage
      ? REPLICATE_MODEL_VERSIONS["z-image-fast-img2img"]
      : ((model ? REPLICATE_MODEL_VERSIONS[model] : null) ??
        REPLICATE_MODEL_VERSIONS["z-image-fast"]);
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

  // Run predictions sequentially with a gap to stay within Replicate's burst limit
  const predictions: ReplicateCreateResult[] = [];
  for (let i = 0; i < n; i++) {
    if (i > 0) {
      // 1500ms gap between sequential requests to avoid burst rate limiting
      await new Promise((r) => setTimeout(r, 1500));
    }
    const resp = await fetchWithRetry(
      `${REPLICATE_API_BASE}/v1/predictions`,
      `${REPLICATE_DIRECT}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          version,
          input: {
            prompt,
            width,
            height,
            num_outputs: 1,
            ...(duration ? { duration } : {}),
            ...((model === "z-image-fast" || model?.startsWith("z-video")) && hasReferenceImage
              ? { image: urls[0] }
              : {}),
          },
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

  // Polling can happen many times per generated image. Keep status checks off
  // Cloudflare AI Gateway so Gateway analytics reflect real generation creates,
  // not repeated Replicate GET requests.
  const directResp = key
    ? await fetch(`${REPLICATE_DIRECT}/${predictionId}`, { headers: pollHeaders })
    : null;
  const resp =
    directResp ??
    (await fetchWithFallback(
      `${REPLICATE_API_BASE}/v1/predictions/${predictionId}`,
      `${REPLICATE_DIRECT}/${predictionId}`,
      { headers: pollHeaders },
      "replicate",
    ));

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
        ...(opts?.maxTokens ? { max_tokens: opts.maxTokens } : {}),
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
    choices: Array<{
      message: { content: string };
      finish_reason: string;
    }>;
  };
  const choice = data.choices[0];
  if (!choice) return "";
  const text = choice.message.content.trim();

  // DeepSeek v4 reasoning models may use all tokens for internal reasoning,
  // leaving content empty. Retry once with doubled max_tokens if needed.
  if (!text && opts?.maxTokens) {
    const retryOpts = { ...opts, maxTokens: opts.maxTokens * 2 };
    const retryResp = await fetchWithFallback(
      DEEPSEEK_HOST,
      DEEPSEEK_DIRECT,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: opts?.model ?? "deepseek-v4-flash",
          max_tokens: retryOpts.maxTokens,
          temperature: retryOpts.temperature ?? 0.7,
          messages,
        }),
      },
      "deepseek",
    );
    if (retryResp.ok) {
      const retryData = (await retryResp.json()) as typeof data;
      return retryData.choices[0]?.message?.content?.trim() ?? "";
    }
  }

  return text;
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
    { temperature: 0.7, model: "deepseek-v4-flash" },
  );

  return text
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface TextGenerationParams {
  prompt: string;
  model?: string;
  maxTokens?: number;
}

export async function generateText({
  prompt,
  model,
  maxTokens,
}: TextGenerationParams): Promise<string> {
  return chatDeepseek([{ role: "user", content: prompt }], {
    model: model ?? "deepseek-v4-flash",
    maxTokens: maxTokens ?? 2048,
    temperature: 0.8,
  });
}
