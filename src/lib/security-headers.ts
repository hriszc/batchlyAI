export function applySecurityHeaders(headers: Headers): void {
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");
  headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self'; connect-src 'self' https://gateway.ai.cloudflare.com https://api.deepseek.com https://api.replicate.com https://grsaiapi.com https://accounts.google.com https://*.batchlyai.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  );
}
