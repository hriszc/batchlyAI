/**
 * Staging access guard — prevents unauthorized access to staging environment.
 *
 * Activated only when STAGING_ACCESS_TOKEN is set (via wrangler secret put --env staging).
 * In production (no STAGING_ACCESS_TOKEN), all requests pass through.
 *
 * Two ways to authenticate:
 * 1. X-Staging-Token header
 * 2. staging_token cookie (set via the HTML form)
 */

import { env } from "@/env/server";

const HTML_FORM = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>BatchlyAI Staging</title>
  <style>
    body { font-family: -apple-system, sans-serif; display: flex; justify-content: center;
           align-items: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
    form { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 2px 20px rgba(0,0,0,0.1); }
    input { width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 8px;
            font-size: 14px; box-sizing: border-box; }
    button { width: 100%; margin-top: 12px; padding: 10px; background: #0071e3; color: white;
             border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
    h1 { font-size: 18px; margin-bottom: 16px; text-align: center; }
  </style>
</head>
<body>
  <form method="POST">
    <h1>BatchlyAI Staging</h1>
    <input type="password" name="token" placeholder="Access Token" autofocus />
    <button type="submit">Access Staging</button>
  </form>
</body>
</html>`;

export async function stagingGuard(request: Request): Promise<Response | null> {
  // Only active when STAGING_ACCESS_TOKEN is configured
  const token = env.STAGING_ACCESS_TOKEN;
  if (!token) return null;

  // Handle token submission from HTML form
  if (request.method === "POST" && new URL(request.url).pathname === "/__staging-login") {
    return await handleLogin(request, token);
  }

  // Check header
  const headerToken = request.headers.get("X-Staging-Token");
  if (headerToken === token) return null;

  // Check cookie
  const cookie = request.headers.get("Cookie") || "";
  const cookieMatch = cookie.match(/staging_token=([^;]+)/);
  if (cookieMatch?.[1] === token) return null;

  // Block — return login form
  return new Response(HTML_FORM, {
    status: 401,
    headers: { "Content-Type": "text/html" },
  });
}

async function handleLogin(request: Request, token: string): Promise<Response> {
  const body = await request.text();
  const params = new URLSearchParams(body);
  const submitted = params.get("token");

  if (submitted === token) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/",
        "Set-Cookie": `staging_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
      },
    });
  }

  return new Response(
    HTML_FORM.replace(
      "</form>",
      '<p style="color:red;text-align:center;margin-top:8px">Invalid token</p></form>',
    ),
    { status: 401, headers: { "Content-Type": "text/html" } },
  );
}
