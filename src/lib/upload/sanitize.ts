export function sanitizeFilename(raw: string): string {
  const sanitized = raw
    .replaceAll("\0", "")
    .replace(/[/\\]/g, "_")
    .replace(/^\.+/, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 200);

  return sanitized || "upload";
}
