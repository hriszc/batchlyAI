const FILE_URL_TTL_SECONDS = 30 * 24 * 60 * 60;

function getRuntimeEnv(): Record<string, unknown> | undefined {
  return (globalThis as Record<string, unknown>).__env__ as Record<string, unknown> | undefined;
}

function getFileUrlSecret(): string {
  const env = getRuntimeEnv();
  return (
    (env?.GRS_WEBHOOK_SECRET as string | undefined) ??
    (env?.BETTER_AUTH_SECRET as string | undefined) ??
    "dev-secret-do-not-use-in-production-42-characters-minimum"
  );
}

async function hmacHex(input: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getFileUrlSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(input));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSignedFileUrl(pathname: string): Promise<string> {
  const expires = Math.floor(Date.now() / 1000) + FILE_URL_TTL_SECONDS;
  const sig = await hmacHex(`${pathname}.${expires}`);
  const base = (getRuntimeEnv()?.VITE_BASE_URL as string | undefined) || "https://batchlyai.com";
  const url = new URL(pathname, base);
  url.searchParams.set("expires", String(expires));
  url.searchParams.set("sig", sig);
  return url.toString();
}

export async function hasValidSignedFileAccess(
  request: Request,
  pathname: string,
): Promise<boolean> {
  const url = new URL(request.url || "https://batchlyai.com");
  const expiresRaw = url.searchParams.get("expires");
  const sig = url.searchParams.get("sig");
  if (!expiresRaw || !sig) return false;

  const expires = Number.parseInt(expiresRaw, 10);
  if (!Number.isFinite(expires) || expires < Math.floor(Date.now() / 1000)) return false;

  const expected = await hmacHex(`${pathname}.${expires}`);
  return expected === sig;
}
