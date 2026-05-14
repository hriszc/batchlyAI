interface AuthLikeError {
  error?: unknown;
  message?: unknown;
}

function readMessage(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const message = record.message ?? record.error ?? record.statusText;
  return typeof message === "string" && message.trim() ? message : null;
}

export function getAuthErrorMessage(value: unknown, fallback: string): string {
  if (value instanceof Error) return value.message || fallback;
  const direct = readMessage(value);
  if (direct) return direct;
  if (typeof value === "object" && value) {
    const nested = readMessage((value as AuthLikeError).error);
    if (nested) return nested;
  }
  return fallback;
}
