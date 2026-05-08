interface R2Binding {
  put(key: string, value: ArrayBuffer | ReadableStream | string): Promise<void>;
}

function getR2Binding(): R2Binding | null {
  const env = (globalThis as Record<string, unknown>).__env__ as
    | Record<string, unknown>
    | undefined;
  console.log("[r2] __env__ exists:", !!env, "batchlyai_r2 exists:", !!env?.batchlyai_r2);
  return (env?.batchlyai_r2 as R2Binding) ?? null;
}

export function getR2PublicUrl(key: string): string {
  const env = (globalThis as Record<string, unknown>).__env__ as
    | Record<string, unknown>
    | undefined;
  const endpoint = env?.R2_ENDPOINT as string | undefined;
  const bucket = env?.R2_BUCKET as string | undefined;
  if (endpoint && bucket) return `${endpoint}/${bucket}/${key}`;
  return key;
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
    console.warn("[r2] mirrorImageToR2: no R2 binding, keeping original URL:", imageUrl?.slice(0, 80));
    return imageUrl;
  }

  try {
    console.log("[r2] mirroring", imageUrl?.slice(0, 80), "->", r2Key);
    const resp = await fetch(imageUrl);
    if (!resp.ok) {
      console.warn("[r2] fetch failed for", imageUrl?.slice(0, 80), "status:", resp.status);
      return imageUrl;
    }
    const blob = await resp.arrayBuffer();
    await r2.put(r2Key, blob);
    console.log("[r2] mirrored OK:", r2Key);
    return getR2PublicUrl(r2Key);
  } catch (err) {
    console.error("[r2] mirrorImageToR2 error:", err);
    return imageUrl;
  }
}
