export interface WorkQualityInput {
  title?: string | null;
  description?: string | null;
  useCase?: string | null;
  category?: string | null;
  promptTemplate?: string | null;
  originalPromptTemplate?: string | null;
  variableGroups?: unknown;
  coverUrl?: string | null;
  resultUrls?: string[] | string | null;
  model?: string | null;
  isPublished?: number | boolean | null;
}

export interface VariableGroupSummary {
  id: string;
  values: string[];
}

const UUID_SUFFIX_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const NSFW_RISK_PATTERN =
  /\b(nsfw|porn|porno|pornographic|nude|nudity|naked|erotic|explicit sex|sexual content|fetish|hentai)\b|成人|裸露|色情|成人视频|性暗示/i;

const LOW_VALUE_TITLE_PATTERN = /^(untitled|test|draft|published work|new work|image|result)$/i;

const MODEL_LABELS: Record<string, string> = {
  "z-image-fast": "Image Turbo",
  "z-image-pro": "Image Pro",
  "z-video-fast": "Video Turbo",
  "z-video-pro": "Video Pro",
  "z-text-fast": "Text Turbo",
  "z-text-pro": "Text Pro",
};

const CATEGORY_LABELS: Record<string, string> = {
  ecommerce: "Ecommerce",
  art: "Art",
  "social-media": "Social media",
  marketing: "Marketing",
  general: "General",
};

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function stripTemplateMarkers(value: string): string {
  return collapseWhitespace(
    value
      .replace(/\{\{([^}]+)\}\}/g, "$1")
      .replace(/\{\*([^}]+)\*\}/g, "$1")
      .replace(/[{}*_`]/g, " "),
  );
}

function textLength(value: string): number {
  return stripTemplateMarkers(value).replace(/\s/g, "").length;
}

function variableValueTextLength(value: unknown): number {
  return parseVariableGroups(value).reduce(
    (total, group) => total + group.values.reduce((sum, item) => sum + textLength(item), 0),
    0,
  );
}

function parseJsonArray(value: string): unknown[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseWorkResultUrls(value: WorkQualityInput["resultUrls"]): string[] {
  const raw = typeof value === "string" ? parseJsonArray(value) : Array.isArray(value) ? value : [];
  return raw.flatMap((item) => (typeof item === "string" && item.trim() ? [item.trim()] : []));
}

export function parseVariableGroups(value: unknown): VariableGroupSummary[] {
  const rawGroups =
    typeof value === "string" ? parseJsonArray(value) : Array.isArray(value) ? value : [];

  return rawGroups.flatMap((group, index) => {
    if (!group || typeof group !== "object") return [];
    const record = group as { id?: unknown; values?: unknown };
    const values = Array.isArray(record.values)
      ? record.values
          .filter((item) => typeof item === "string" && item.trim())
          .map((item) => item.trim())
      : [];
    if (!values.length) return [];
    return [
      {
        id: typeof record.id === "string" && record.id.trim() ? record.id.trim() : `var_${index}`,
        values,
      },
    ];
  });
}

export function getWorkPrimaryPrompt(work: WorkQualityInput): string {
  return (
    (typeof work.originalPromptTemplate === "string" && work.originalPromptTemplate.trim()) ||
    (typeof work.promptTemplate === "string" && work.promptTemplate.trim()) ||
    ""
  );
}

export function getModelDisplayName(model: string | null | undefined): string {
  if (!model) return "AI model";
  return MODEL_LABELS[model] ?? model;
}

export function getCategoryDisplayName(category: string | null | undefined): string {
  if (!category) return "General";
  return CATEGORY_LABELS[category] ?? category;
}

export function getWorkUseCase(work: WorkQualityInput): string {
  const generatedUseCase = collapseWhitespace(work.useCase || "");
  if (generatedUseCase) return generatedUseCase;

  const category = work.category || "general";
  const model = getModelDisplayName(work.model);

  switch (category) {
    case "ecommerce":
      return `Use this ${model} work as a starting point for product pages, storefront visuals, and campaign creatives.`;
    case "social-media":
      return `Use this ${model} work as a reusable idea for posts, stories, thumbnails, and short-form social content.`;
    case "marketing":
      return `Use this ${model} work to explore ad concepts, launch visuals, and brand promotion ideas.`;
    case "art":
      return `Use this ${model} work for character ideas, visual exploration, moodboards, and creative references.`;
    default:
      return `Use this ${model} work as a reusable AI generation example that can be remixed with your own variables.`;
  }
}

export function buildWorkSeoDescription(work: WorkQualityInput): string {
  const description = collapseWhitespace(work.description || "");
  if (description.length >= 80) return description.slice(0, 160);

  const prompt = stripTemplateMarkers(getWorkPrimaryPrompt(work));
  const category = getCategoryDisplayName(work.category).toLowerCase();
  const model = getModelDisplayName(work.model);
  const promptSuffix = prompt ? ` Prompt idea: ${prompt.slice(0, 90)}.` : "";

  return collapseWhitespace(
    `${description || work.title || "AI generated work"} created with ${model} for ${category} use cases.${promptSuffix}`,
  ).slice(0, 160);
}

export function getWorkNoindexReason(work: WorkQualityInput): string | null {
  if (work.isPublished === 0 || work.isPublished === false) return "unpublished";

  const title = collapseWhitespace(work.title || "");
  const description = collapseWhitespace(work.description || "");
  const prompt = getWorkPrimaryPrompt(work);
  const promptContentLength = textLength(prompt) + variableValueTextLength(work.variableGroups);
  const content = `${title} ${description} ${work.originalPromptTemplate || ""} ${work.promptTemplate || ""}`;
  const resultUrls = parseWorkResultUrls(work.resultUrls);

  if (NSFW_RISK_PATTERN.test(content)) return "content-risk";
  if (!title || title.length < 6 || LOW_VALUE_TITLE_PATTERN.test(title)) return "thin-title";
  if (!description || description.length < 30) return "thin-description";
  if (!prompt || promptContentLength < 12) return "thin-prompt";
  if (!work.category) return "missing-category";
  if (!work.coverUrl || !work.coverUrl.trim()) return "missing-cover";
  if (!resultUrls.length) return "missing-results";

  return null;
}

export function isIndexableWork(work: WorkQualityInput): boolean {
  return getWorkNoindexReason(work) === null;
}

export function slugifyWorkTitle(title: string | null | undefined): string {
  const slug = (title || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 72)
    .replace(/-+$/g, "");

  return slug || "ai-work";
}

export function getWorkPath(work: { id: string; title?: string | null }): string {
  return `/works/${slugifyWorkTitle(work.title)}-${work.id}`;
}

export function extractWorkIdFromPathParam(param: string): string {
  let decoded = param;
  try {
    decoded = decodeURIComponent(param);
  } catch {
    decoded = param;
  }
  const uuidMatch = decoded.match(UUID_SUFFIX_PATTERN);
  return uuidMatch?.[0] || decoded;
}
