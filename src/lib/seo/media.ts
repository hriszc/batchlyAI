export type SeoMediaType = "image" | "video" | "text";

export function mediaTypeFromModel(model?: string | null): SeoMediaType {
  if (model?.startsWith("z-video")) return "video";
  if (model?.startsWith("z-text")) return "text";
  return "image";
}

export function mediaLabel(type: SeoMediaType): string {
  if (type === "video") return "video";
  if (type === "text") return "text";
  return "image";
}
