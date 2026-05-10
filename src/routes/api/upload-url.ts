import { createFileRoute } from "@tanstack/react-router";

import { jsonResponse } from "@/lib/api-helpers";
import { createAuth } from "@/lib/auth/auth";
import { createSignedFileUrl } from "@/lib/cloudflare/file-url-signing";
import { uploadToR2 } from "@/lib/cloudflare/r2";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeFilename } from "@/lib/upload/sanitize";

const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/bmp",
  "image/tiff",
];

const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".bmp", ".tiff"];

export async function handleUpload(request: Request): Promise<Response> {
  const auth = createAuth();
  if (!auth) {
    return jsonResponse({ error: "Auth unavailable" }, 501);
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const limit = checkRateLimit(`upload:user:${session.user.id}`, 20, 60);
  if (!limit.allowed) {
    return jsonResponse({ error: "Upload rate limit exceeded. Please try again later." }, 429);
  }

  const rawFilename = request.headers.get("x-file-name") || "";
  const filename = sanitizeFilename(decodeURIComponent(rawFilename));

  const ext = filename.includes(".") ? filename.slice(filename.lastIndexOf(".")).toLowerCase() : "";
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return jsonResponse({ error: `File type not allowed: ${ext || "unknown"}` }, 400);
  }

  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType || !ALLOWED_MIME_TYPES.includes(contentType)) {
    return jsonResponse({ error: `Content-Type not allowed: ${contentType || "unknown"}` }, 400);
  }

  // Read entire body into buffer — request.body stream may be consumed by
  // middleware or sent with chunked encoding, losing data if passed raw to R2.
  let buffer: ArrayBuffer;
  try {
    buffer = await request.arrayBuffer();
  } catch {
    return jsonResponse({ error: "Failed to read request body" }, 400);
  }

  if (buffer.byteLength === 0) {
    return jsonResponse({ error: "Empty file" }, 400);
  }

  const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
  if (buffer.byteLength > MAX_SIZE) {
    return jsonResponse({ error: "File too large (max 10 MB)" }, 413);
  }

  const sanitizedUserId = session.user.id.replace(/[^a-zA-Z0-9_-]/g, "_");
  const key = `uploads/${sanitizedUserId}/${Date.now()}_${filename}`;

  try {
    const result = await uploadToR2(key, buffer);

    if (!result.success) {
      return jsonResponse({ error: "R2 not configured" }, 501);
    }

    const proxyUrl = await createSignedFileUrl(`/api/files/${key}`);

    return jsonResponse({ publicUrl: proxyUrl, key }, 200);
  } catch (err) {
    console.error("[upload] R2 put error:", err);
    return jsonResponse({ error: "Upload failed" }, 500);
  }
}

export const Route = createFileRoute("/api/upload-url")({
  server: {
    handlers: {
      POST: async ({ request }) => handleUpload(request),
    },
  },
});
