import { XIcon } from "lucide-react";
import { useState } from "react";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { Language } from "@/lib/i18n/translations";

interface WorkPublishModalProps {
  open: boolean;
  onClose: () => void;
  language: Language;
  resultUrls: string[];
  promptTemplate: string;
  variableGroups: Array<{ values: string[] }>;
  model: string;
  generationId?: string;
}

const CATEGORIES = [
  { value: "ecommerce", labelEn: "E-commerce", labelZh: "电商" },
  { value: "art", labelEn: "Art", labelZh: "艺术" },
  { value: "social-media", labelEn: "Social Media", labelZh: "社交媒体" },
  { value: "marketing", labelEn: "Marketing", labelZh: "营销" },
  { value: "other", labelEn: "Other", labelZh: "其他" },
];

export function WorkPublishModal({
  open,
  onClose,
  language,
  resultUrls,
  promptTemplate,
  variableGroups,
  model,
  generationId,
}: WorkPublishModalProps) {
  const { t } = useLanguage();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [coverUrl, setCoverUrl] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const isZh = language === "zh";

  const handlePublish = async () => {
    if (!title.trim()) {
      setError(t("workTitle") + " " + (isZh ? "不能为空" : "is required"));
      return;
    }
    if (!coverUrl) {
      setError(t("selectCover"));
      return;
    }

    setPublishing(true);
    setError(null);

    try {
      const resp = await fetch("/api/works", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          coverUrl,
          resultUrls,
          promptTemplate,
          variableGroups,
          model,
          generationId,
        }),
      });

      const data = (await resp.json()) as { id?: string; error?: string };

      if (data.error) {
        setError(data.error);
        setPublishing(false);
        return;
      }

      setPublishing(false);
      onClose();
    } catch {
      setError(t("workPublishFailed"));
      setPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-card p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <XIcon className="size-5" />
        </button>

        <h2 className="mb-4 text-xl font-semibold">{t("publishWork")}</h2>

        {/* Cover image selector */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-foreground">
            {t("selectCover")}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {resultUrls.map((url, i) => (
              <button
                key={i}
                onClick={() => setCoverUrl(url)}
                className={`overflow-hidden rounded-lg border-2 transition-all ${
                  coverUrl === url
                    ? "border-[#0071e3] ring-2 ring-[#0071e3]/30"
                    : "border-border hover:border-muted-foreground"
                }`}
              >
                <img
                  src={url}
                  alt={`Result ${i + 1}`}
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium text-foreground">
            {t("workTitle")} *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={isZh ? "输入作品标题" : "Enter work title"}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          />
        </div>

        {/* Description */}
        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium text-foreground">
            {t("workDescription")}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={isZh ? "描述你的作品（可选）" : "Describe your work (optional)"}
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          />
        </div>

        {/* Category */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-foreground">
            {t("workCategory")}
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {isZh ? cat.labelZh : cat.labelEn}
              </option>
            ))}
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={publishing}
            className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-muted disabled:opacity-40"
          >
            {isZh ? "取消" : "Cancel"}
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing || !title.trim() || !coverUrl}
            className="inline-flex items-center gap-2 rounded-[980px] bg-[#0071e3] px-5 py-2 text-sm font-medium text-white transition-all hover:bg-[#0077ed] focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
          >
            {publishing ? (
              <span className="inline-block size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : null}
            {t("publish")}
          </button>
        </div>
      </div>
    </div>
  );
}
