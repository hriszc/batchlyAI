import { Share2Icon, DownloadIcon } from "lucide-react";
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
  totalExpected?: number,
) {
  if (isGenerating) {
    return totalExpected ? `Generating ${totalExpected} outputs...` : "Generating outputs...";
  }
  const complete = results.filter((r) => r.status === "complete").length;
  const pending = results.filter((r) => r.status === "pending" || r.status === "generating").length;
  const failed = results.filter((r) => r.status === "error").length;
  const parts = [];
  if (complete > 0) parts.push(`${complete} ready`);
  if (pending > 0) parts.push(`${pending} working`);
  if (failed > 0) parts.push(`${failed} failed`);
  return parts.length > 0 ? parts.join(" · ") : "No results yet";
}

export function ResultsGrid({
  results,
  isGenerating,
  showWatermark = false,
  totalExpected,
  onShare,
  onPublish,
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
      const ext = url ? "png" : "txt";
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

  const showActions = !isGenerating && results.length > 0;

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
                title="Share Results"
              >
                <Share2Icon className="size-4" />
              </button>
            )}
            {onPublish && (
              <button
                type="button"
                onClick={onPublish}
                className="inline-flex h-8 items-center gap-1 rounded-lg border bg-muted/30 px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title={t("publishWork")}
              >
                {t("publish")}
              </button>
            )}
            {displayResults.length >= 2 && (
              <button
                type="button"
                onClick={handleDownloadAll}
                disabled={downloading}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-muted/30 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                title="Download All"
              >
                <DownloadIcon className="size-4" />
              </button>
            )}
          </div>
        )}
      </div>

      <p className="mb-4 text-center text-sm text-muted-foreground">
        {getResultStatusText(results, isGenerating, totalExpected)}
      </p>

      {showActions && (
        <div className="mb-4 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="inline-flex items-center rounded-full border bg-muted/30 px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {showAll ? `Show all (${results.length})` : `Best (${filterBest(results).length})`}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {isGenerating
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : displayResults.map((result) => (
              <ResultCard key={result.id} result={result} showWatermark={showWatermark} />
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
