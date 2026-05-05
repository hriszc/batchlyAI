export function sanitizeFilename(raw: string): string {
  let sanitized = raw
    .replace(/\x00/g, "")
    .replace(/[/\\]/g, "_")
    .replace(/^\.+/, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 200);

  if (!sanitized) {
    sanitized = "upload";
  }

  return sanitized;
}
