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
