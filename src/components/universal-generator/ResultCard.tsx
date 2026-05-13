import { DownloadIcon, ImageIcon, AlertCircleIcon, Loader2Icon } from "lucide-react";

import { useLanguage } from "@/lib/i18n/LanguageContext";

import type { GeneratedResult } from "./types";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function InlineMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        if (line.startsWith("### "))
          return (
            <h3 key={i} className="mt-2 mb-1 text-sm font-semibold">
              {escapeHtml(line.slice(4))}
            </h3>
          );
        if (line.startsWith("## "))
          return (
            <h2 key={i} className="mt-3 mb-1 text-base font-semibold">
              {escapeHtml(line.slice(3))}
            </h2>
          );
        if (line.startsWith("# "))
          return (
            <h1 key={i} className="mt-3 mb-1 text-lg font-bold">
              {escapeHtml(line.slice(2))}
            </h1>
          );
        if (line.startsWith("- "))
          return (
            <li key={i} className="ml-4 text-sm">
              {renderInline(line.slice(2))}
            </li>
          );
        if (line === "") return <br key={i} />;
        return (
          <p key={i} className="text-sm">
            {renderInline(line)}
          </p>
        );
      })}
    </>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i}>{escapeHtml(part.slice(2, -2))}</strong>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={i}>{escapeHtml(part.slice(1, -1))}</em>;
    if (part.startsWith("`") && part.endsWith("`"))
      return (
        <code key={i} className="rounded bg-muted/50 px-1 text-xs">
          {escapeHtml(part.slice(1, -1))}
        </code>
      );
    return <span key={i}>{escapeHtml(part)}</span>;
  });
}

interface ResultCardProps {
  result: GeneratedResult;
  showWatermark?: boolean;
}

async function downloadUrl(url: string, filename: string) {
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(objUrl);
  } catch {
    // Fallback: open in new tab
    window.open(url, "_blank");
  }
}

async function downloadWithWatermark(imageUrl: string, filename: string) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  // Watermark at bottom-right
  const text = "batchlyai.com";
  const fontSize = Math.max(14, Math.floor(canvas.width / 40));
  ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
  const metrics = ctx.measureText(text);
  const padding = fontSize;
  const x = canvas.width - metrics.width - padding;
  const y = canvas.height - padding;

  // Semi-transparent background for readability
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  const boxH = fontSize + padding * 0.6;
  ctx.fillRect(x - padding * 0.4, y - fontSize, metrics.width + padding * 0.8, boxH);

  // Text
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.fillText(text, x, y);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    void downloadUrl(url, filename);
    URL.revokeObjectURL(url);
  }, "image/png");
}

export function ResultCard({ result, showWatermark = false }: ResultCardProps) {
  const { combination } = result;
  const { t } = useLanguage();

  const hasDownloadable = (result.imageUrl || result.textContent) && result.status === "complete";

  return (
    <div className="group relative overflow-hidden rounded-[8px] border bg-card shadow-sm">
      <div className="flex aspect-square items-center justify-center bg-muted">
        {result.imageUrl ? (
          <div className="relative h-full w-full">
            <img
              src={result.imageUrl}
              alt={combination.prompt}
              className="h-full w-full object-cover"
            />
            {showWatermark && (
              <div className="absolute right-2 bottom-2 rounded bg-black/50 px-2 py-0.5 text-[10px] text-white/70 backdrop-blur-sm">
                {t("generatedByBatchlyAI")}
              </div>
            )}
            {hasDownloadable && (
              <button
                onClick={() => {
                  if (showWatermark) {
                    void downloadWithWatermark(result.imageUrl!, `batchlyai-${result.id}.png`);
                  } else {
                    void downloadUrl(result.imageUrl!, `batchlyai-${result.id}.png`);
                  }
                }}
                className="absolute top-2 right-2 rounded-lg bg-black/50 p-1.5 text-white/80 opacity-100 backdrop-blur-sm transition-opacity hover:bg-black/70 md:opacity-0 md:group-hover:opacity-100"
                title={showWatermark ? t("downloadWithWatermark") : t("download")}
              >
                <DownloadIcon className="size-4" />
              </button>
            )}
          </div>
        ) : result.textContent ? (
          <div className="relative flex h-full w-full flex-col items-center justify-start overflow-y-auto p-4">
            <div className="prose prose-sm max-w-none text-left text-foreground/80">
              <InlineMarkdown text={result.textContent} />
            </div>
            {hasDownloadable && (
              <button
                onClick={() => {
                  const blob = new Blob([result.textContent!], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  void downloadUrl(url, `batchlyai-${result.id}.txt`);
                  URL.revokeObjectURL(url);
                }}
                className="absolute top-2 right-2 rounded-lg bg-black/50 p-1.5 text-white/80 opacity-100 backdrop-blur-sm transition-opacity hover:bg-black/70 md:opacity-0 md:group-hover:opacity-100"
                title={t("download")}
              >
                <DownloadIcon className="size-4" />
              </button>
            )}
          </div>
        ) : result.status === "error" ? (
          <div className="flex flex-col items-center gap-1 text-muted-foreground/40">
            <AlertCircleIcon className="size-8" />
            <span className="text-xs">{t("resultFailed")}</span>
          </div>
        ) : result.status === "generating" ? (
          <Loader2Icon className="size-8 animate-spin text-muted-foreground/40" />
        ) : (
          <ImageIcon className="size-8 text-muted-foreground/30" />
        )}
      </div>
      <p className="line-clamp-2 px-4 pt-4 text-sm leading-[1.29] text-foreground/80">
        {combination.prompt}
      </p>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 px-4 pt-2 pb-4 text-xs leading-[1.33] text-muted-foreground">
        {Object.entries(combination.variables).map(([key, val]) => (
          <span key={key}>
            {key}: {val}
          </span>
        ))}
      </div>
    </div>
  );
}
