import "@tanstack/react-start/server-only";
import { env } from "@/env/server";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

interface TurnstileSiteverifyResponse {
  success?: boolean;
  "error-codes"?: string[];
}

function isLocalBaseUrl(): boolean {
  try {
    return LOCAL_HOSTS.has(new URL(env.VITE_BASE_URL).hostname);
  } catch {
    return false;
  }
}

export function shouldEnforceTurnstile(): boolean {
  if (process.env.NODE_ENV === "test") return Boolean(env.TURNSTILE_SECRET_KEY);
  return !isLocalBaseUrl();
}

export async function verifyTurnstileToken(
  token: unknown,
  request: Request,
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  if (!shouldEnforceTurnstile()) return { ok: true };

  if (typeof token !== "string" || token.length === 0 || token.length > 2048) {
    return { ok: false, status: 403, message: "Human verification required" };
  }

  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error("[turnstile] TURNSTILE_SECRET_KEY is not configured");
    return { ok: false, status: 503, message: "Human verification unavailable" };
  }

  try {
    const remoteip =
      request.headers.get("CF-Connecting-IP") ||
      request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim();

    const resp = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret,
        response: token,
        ...(remoteip ? { remoteip } : {}),
        idempotency_key: crypto.randomUUID(),
      }),
    });

    if (!resp.ok) {
      console.error("[turnstile] Siteverify HTTP error:", resp.status);
      return { ok: false, status: 403, message: "Human verification failed" };
    }

    const result = (await resp.json()) as TurnstileSiteverifyResponse;
    if (!result.success) {
      console.warn("[turnstile] Siteverify failed:", result["error-codes"] ?? []);
      return { ok: false, status: 403, message: "Human verification failed" };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[turnstile] Siteverify request failed:", message);
    return { ok: false, status: 403, message: "Human verification failed" };
  }
}
