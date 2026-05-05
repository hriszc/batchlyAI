interface R2Binding {
  put(key: string, value: ArrayBuffer | ReadableStream | string): Promise<void>;
}

function getR2Binding(): R2Binding | null {
  const env = (globalThis as Record<string, unknown>).__env__ as
    | Record<string, unknown>
    | undefined;
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
