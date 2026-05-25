import { Share2Icon, DownloadIcon, Loader2Icon } from "lucide-react";
import { useState, useMemo, useCallback } from "react";

import { useLanguage } from "@/lib/i18n/LanguageContext";

import { ResultCard } from "./ResultCard";
import type { GeneratedResult } from "./types";

interface ResultsGridProps {
  results: GeneratedResult[];
  isGenerating: boolean;
  totalExpected?: number;
  showWatermark?: boolean;
  onShare?: () => void;
  onPublish?: () => void;
  isPublishing?: boolean;
}

function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-[8px] border bg-card">
      <div className="aspect-square bg-muted" />
      <div className="space-y-2 px-4 pt-4 pb-4">
        <div className="h-4 w-3/4 rounded bg-muted-foreground/10" />
        <div className="h-3 w-1/2 rounded bg-muted-foreground/5" />
      </div>
    </div>
  );
}

function filterBest(results: GeneratedResult[]): GeneratedResult[] {
  const seen = new Set<string>();
  return results.filter((r) => {
    if (r.status !== "complete") return false;
    if (!r.imageUrl) return false;
    if (seen.has(r.imageUrl)) return false;
    seen.add(r.imageUrl);
    return true;
  });
}

function getResultStatusText(
  results: GeneratedResult[],
  isGenerating: boolean,
  t: ReturnType<typeof useLanguage>["t"],
  totalExpected?: number,
) {
  const complete = results.filter((r) => r.status === "complete").length;
  const pending = isGenerating
    ? Math.max(0, (totalExpected ?? results.length) - results.length)
    : results.filter((r) => r.status === "pending" || r.status === "generating").length;
  const failed = results.filter((r) => r.status === "error").length;
  if (isGenerating && results.length === 0) {
    return totalExpected ? t("generatingCount", { count: totalExpected }) : t("generatingOutputs");
  }
  const parts = [];
  if (complete > 0) parts.push(t("readyCount", { count: complete }));
  if (pending > 0) parts.push(t("workingCount", { count: pending }));
  if (failed > 0) parts.push(t("failedCount", { count: failed }));
  return parts.length > 0 ? parts.join(" · ") : t("noResultsYet");
}

export function ResultsGrid({
  results,
  isGenerating,
  showWatermark = false,
  totalExpected,
  onShare,
  onPublish,
  isPublishing = false,
}: ResultsGridProps) {
  const { t } = useLanguage();
  const [showAll, setShowAll] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const displayResults = useMemo(() => {
    if (isGenerating) return results;
    return showAll ? results : filterBest(results);
  }, [results, isGenerating, showAll]);

  const handleDownloadAll = useCallback(async () => {
    const downloadable = displayResults.filter(
      (r) => r.status === "complete" && (r.imageUrl || r.textContent),
    );
    if (downloadable.length === 0) return;
    setDownloading(true);
    for (let i = 0; i < downloadable.length; i++) {
      const r = downloadable[i];
      const url = r.imageUrl;
      const ext = url ? (r.mediaType === "video" ? "mp4" : "png") : "txt";
      const filename = `batchlyai-${r.id}.${ext}`;
      try {
        const content = url || r.textContent || "";
        if (url) {
          const resp = await fetch(url);
          const blob = await resp.blob();
          const objUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = objUrl;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(objUrl);
        } else {
          const blob = new Blob([content], { type: "text/plain" });
          const objUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = objUrl;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(objUrl);
        }
        if (i < downloadable.length - 1) {
          await new Promise((r) => setTimeout(r, 300));
        }
      } catch {
        // Skip failed downloads
      }
    }
    setDownloading(false);
  }, [displayResults]);

  if (!isGenerating && results.length === 0) return null;

  const publishableCount = results.filter(
    (r) => r.status === "complete" && r.imageUrl && r.mediaType !== "video",
  ).length;
  const downloadableCount = displayResults.filter(
    (r) => r.status === "complete" && (r.imageUrl || r.textContent),
  ).length;
  const showActions = !isGenerating && results.length > 0;
  const skeletonCount = isGenerating
    ? Math.min(6, Math.max(0, (totalExpected ?? 6) - results.length))
    : 0;

  return (
    <div className="mt-8">
      <div className="mb-6 flex items-center justify-center gap-3">
        <h2 className="text-[28px] leading-[1.10] font-semibold text-foreground sm:text-[32px] md:text-[40px]">
          {t("results")}
        </h2>
        {showActions && (
          <div className="flex items-center gap-1">
            {onShare && (
              <button
                type="button"
                onClick={onShare}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-muted/30 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title={t("shareResultsAction")}
              >
                <Share2Icon className="size-4" />
              </button>
            )}
            {onPublish && publishableCount > 0 && (
              <button
                type="button"
                onClick={onPublish}
                disabled={isPublishing}
                className="inline-flex h-8 items-center gap-1 rounded-lg border bg-muted/30 px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                title={t("publishWork")}
              >
                {isPublishing && <Loader2Icon className="size-3 animate-spin" />}
                {isPublishing ? t("publishing") : t("publish")}
              </button>
            )}
            {downloadableCount >= 2 && (
              <button
                type="button"
                onClick={handleDownloadAll}
                disabled={downloading}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-muted/30 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                title={t("downloadAll")}
              >
                <DownloadIcon className="size-4" />
              </button>
            )}
          </div>
        )}
      </div>

      <p className="mb-4 text-center text-sm text-muted-foreground">
        {getResultStatusText(results, isGenerating, t, totalExpected)}
      </p>

      {showActions && (
        <div className="mb-4 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="inline-flex items-center rounded-full border bg-muted/30 px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {showAll
              ? t("showAllResults", { count: results.length })
              : t("bestResults", { count: filterBest(results).length })}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {displayResults.map((result) => (
          <ResultCard key={result.id} result={result} showWatermark={showWatermark} />
        ))}
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <SkeletonCard key={`pending-${i}`} />
        ))}
      </div>

      {showActions && (
        <p className="mt-6 text-center text-xs text-muted-foreground/60">
          {t("resultsSaved")}{" "}
          <a href="/my/generations" className="text-accent-blue hover:underline">
            {t("viewHistory")} →
          </a>
        </p>
      )}
    </div>
  );
}
