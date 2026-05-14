interface R2Binding {
  get?(key: string): Promise<{
    body: ReadableStream;
    arrayBuffer?: () => Promise<ArrayBuffer>;
    httpMetadata?: { contentType?: string };
    writeHttpMetadata?: (headers: Headers) => void;
  } | null>;
  put(
    key: string,
    value: ArrayBuffer | ReadableStream | string,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<void>;
}

const MAX_MIRROR_BYTES = 15 * 1024 * 1024;
const ALLOWED_MIRROR_CONTENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
];
const ALLOWED_MIRROR_HOSTS = [
  "replicate.delivery",
  "pbxt.replicate.delivery",
  "grs-cdn.com",
  "grsaiapi.com",
  "batchlyai.com",
];

function getR2Binding(): R2Binding | null {
  const env = (globalThis as Record<string, unknown>).__env__ as
    | Record<string, unknown>
    | undefined;
  console.log("[r2] __env__ exists:", !!env, "batchlyai_r2 exists:", !!env?.batchlyai_r2);
  return (env?.batchlyai_r2 as R2Binding) ?? null;
}

function isAllowedMirrorHost(hostname: string): boolean {
  return ALLOWED_MIRROR_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}

function validateMirrorUrl(imageUrl: string): URL | null {
  try {
    const url = new URL(imageUrl);
    if (url.protocol !== "https:") return null;
    if (!isAllowedMirrorHost(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

function getLocalGenerationFileKey(imageUrl: string): string | null {
  try {
    const url = imageUrl.startsWith("/")
      ? new URL(imageUrl, "https://batchlyai.com")
      : new URL(imageUrl);
    if (url.origin !== "https://batchlyai.com") return null;
    const prefix = "/api/generation-files/";
    if (!url.pathname.startsWith(prefix)) return null;
    const key = decodeURIComponent(url.pathname.slice(prefix.length));
    return key ? key : null;
  } catch {
    return null;
  }
}

async function readLimitedArrayBuffer(resp: Response): Promise<ArrayBuffer | null> {
  const contentLength = Number(resp.headers.get("Content-Length") || "0");
  if (contentLength > MAX_MIRROR_BYTES) return null;

  const body = await resp.arrayBuffer();
  if (body.byteLength > MAX_MIRROR_BYTES) return null;
  return body;
}

export function getR2PublicUrl(key: string): string {
  const env = (globalThis as Record<string, unknown>).__env__ as
    | Record<string, unknown>
    | undefined;
  const endpoint = env?.R2_ENDPOINT as string | undefined;
  const bucket = env?.R2_BUCKET as string | undefined;
  if (endpoint && bucket) return `${endpoint}/${bucket}/${key}`;
  // Proxy through Worker when no custom R2 domain is configured
  return `/api/generation-files/${key}`;
}

export async function uploadToR2(
  key: string,
  body: ArrayBuffer | ReadableStream,
): Promise<{ success: boolean; publicUrl: string }> {
  const r2 = getR2Binding();
  if (!r2) return { success: false, publicUrl: "" };
  await r2.put(key, body);
  return { success: true, publicUrl: getR2PublicUrl(key) };
}

/**
 * Download an image from an external URL and mirror it to R2.
 * Returns the R2 public URL on success, or the original URL on failure.
 */
export async function mirrorImageToR2(imageUrl: string, r2Key: string): Promise<string> {
  const r2 = getR2Binding();
  if (!r2) {
    console.warn(
      "[r2] mirrorImageToR2: no R2 binding, keeping original URL:",
      imageUrl?.slice(0, 80),
    );
    return imageUrl;
  }

  const localKey = getLocalGenerationFileKey(imageUrl);
  if (localKey && r2.get) {
    try {
      const obj = await r2.get(localKey);
      if (!obj) return imageUrl;
      const headers = new Headers();
      obj.writeHttpMetadata?.(headers);
      const contentType =
        obj.httpMetadata?.contentType || headers.get("Content-Type") || "image/png";
      if (!ALLOWED_MIRROR_CONTENT_TYPES.some((type) => contentType.startsWith(type))) {
        console.warn("[r2] blocked local mirrored content type:", contentType);
        return imageUrl;
      }
      const body = obj.arrayBuffer ? await obj.arrayBuffer() : obj.body;
      await r2.put(r2Key, body, { httpMetadata: { contentType } });
      return getR2PublicUrl(r2Key);
    } catch (err) {
      console.error("[r2] local mirrorImageToR2 error:", err);
      return imageUrl;
    }
  }

  const validatedUrl = validateMirrorUrl(imageUrl);
  if (!validatedUrl) {
    console.warn("[r2] mirrorImageToR2 blocked URL:", imageUrl?.slice(0, 120));
    return imageUrl;
  }

  try {
    console.log("[r2] mirroring", validatedUrl.toString().slice(0, 80), "->", r2Key);
    const resp = await fetch(validatedUrl.toString());
    if (!resp.ok) {
      console.warn("[r2] fetch failed for", imageUrl?.slice(0, 80), "status:", resp.status);
      return imageUrl;
    }
    const contentType = resp.headers.get("Content-Type") || "image/png";
    if (!ALLOWED_MIRROR_CONTENT_TYPES.some((type) => contentType.startsWith(type))) {
      console.warn("[r2] blocked mirrored content type:", contentType);
      return imageUrl;
    }

    const blob = await readLimitedArrayBuffer(resp);
    if (!blob) {
      console.warn("[r2] blocked oversized mirrored response:", imageUrl?.slice(0, 80));
      return imageUrl;
    }

    await r2.put(r2Key, blob, { httpMetadata: { contentType } });
    console.log("[r2] mirrored OK:", r2Key);
    return getR2PublicUrl(r2Key);
  } catch (err) {
    console.error("[r2] mirrorImageToR2 error:", err);
    return imageUrl;
  }
}
