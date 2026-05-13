export function applySecurityHeaders(headers: Headers): void {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://accounts.google.com https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    "connect-src 'self' https://gateway.ai.cloudflare.com https://api.deepseek.com https://api.replicate.com https://grsaiapi.com https://accounts.google.com https://oauth2.googleapis.com https://www.google-analytics.com https://*.batchlyai.com https://challenges.cloudflare.com",
    "frame-src https://accounts.google.com https://challenges.cloudflare.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");
  headers.set("Content-Security-Policy", csp);
}
