/**
 * Workers AI fallback — zero-config backup when primary APIs fail.
 * Workers AI runs in the same data center as the Worker: no egress latency.
 * Only triggered when the primary API throws; normal traffic never uses it.
 */

const FALLBACK_MODELS = {
  image: "@cf/openai/gpt-image-2",
  text: "@cf/google/gemini-3.1-flash-lite",
  video: "@cf/alibaba/hh1-i2v",
} as const;

function getAiBinding(): Ai | undefined {
  const platformEnv = (globalThis as Record<string, unknown>).__env__ as
    | Record<string, unknown>
    | undefined;
  return platformEnv?.AI as Ai | undefined;
}

export interface FallbackImageResult {
  urls: string[];
}

export async function generateImageFallback(
  prompt: string,
  aspectRatio: string,
  n: number,
): Promise<FallbackImageResult> {
  const ai = getAiBinding();
  if (!ai) throw new Error("Workers AI binding not available");

  const [w, h] = aspectRatio.split(":").map(Number);
  let width = 1024;
  let height = 1024;
  if (w && h) {
    if (w >= h) {
      width = 1024;
      height = Math.round(1024 * (h / w));
    } else {
      height = 1024;
      width = Math.round(1024 * (w / h));
    }
  }

  const urls: string[] = [];
  for (let i = 0; i < n; i++) {
    const result = (await ai.run(FALLBACK_MODELS.image, {
      prompt,
      width,
      height,
    })) as { image?: string; url?: string };
    const url = result.image || result.url;
    if (url) urls.push(url);
  }
  return { urls };
}

export async function generateTextFallback(prompt: string): Promise<string> {
  const ai = getAiBinding();
  if (!ai) throw new Error("Workers AI binding not available");

  const result = (await ai.run(FALLBACK_MODELS.text, {
    messages: [{ role: "user", content: prompt }],
    max_tokens: 2048,
  })) as {
    response?: string;
    choices?: Array<{ message?: { content?: string } }>;
  };

  return result.response ?? result.choices?.[0]?.message?.content ?? "";
}

export async function generateVideoFallback(
  prompt: string,
  _aspectRatio: string,
  _duration: number,
): Promise<FallbackImageResult> {
  const ai = getAiBinding();
  if (!ai) throw new Error("Workers AI binding not available");

  const result = (await ai.run(FALLBACK_MODELS.video, {
    prompt,
  })) as { video?: string; url?: string };
  const url = result.video || result.url;
  return { urls: url ? [url] : [] };
}
