export const SHARE_VIDEO_MIME_CANDIDATES = [
  { mimeType: "video/mp4;codecs=avc1.42E01E", extension: "mp4" },
  { mimeType: "video/mp4", extension: "mp4" },
  { mimeType: "video/webm;codecs=vp9", extension: "webm" },
  { mimeType: "video/webm;codecs=vp8", extension: "webm" },
  { mimeType: "video/webm", extension: "webm" },
] as const;

export function getShareVideoDurationSeconds(resultCount: number): number {
  return Math.min(15, Math.max(6, 3 + Math.max(0, resultCount) * 2));
}

export function pickShareVideoMimeType(
  recorder: Pick<typeof MediaRecorder, "isTypeSupported"> | undefined = typeof MediaRecorder ===
  "undefined"
    ? undefined
    : MediaRecorder,
): { mimeType: string; extension: "mp4" | "webm" } | null {
  if (!recorder?.isTypeSupported) return null;
  return (
    SHARE_VIDEO_MIME_CANDIDATES.find((candidate) => recorder.isTypeSupported(candidate.mimeType)) ??
    null
  );
}
