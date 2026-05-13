import { applySecurityHeaders } from "./security-headers";

export function jsonResponse(
  data: unknown,
  status: number,
  extraHeaders?: Record<string, string>,
): Response {
  const headers = new Headers({ "Content-Type": "application/json" });
  applySecurityHeaders(headers);
  if (extraHeaders) {
    for (const [k, v] of Object.entries(extraHeaders)) {
      headers.set(k, v);
    }
  }
  return new Response(JSON.stringify(data), { status, headers });
}

const ALLOWED_ORIGINS = ["https://batchlyai.com", "http://localhost:3000"];

export function verifyOrigin(request: Request): boolean {
  const origin = request.headers?.get("Origin");
  if (!origin) return true; // same-origin requests have no Origin header
  return ALLOWED_ORIGINS.includes(origin);
}

export function requireValidOrigin(request: Request): Response | null {
  if (verifyOrigin(request)) return null;
  return jsonResponse({ error: "Invalid origin" }, 403);
}
