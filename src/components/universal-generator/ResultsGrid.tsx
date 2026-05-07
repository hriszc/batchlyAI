import { useState, useMemo } from "react";

import { useLanguage } from "@/lib/i18n/LanguageContext";

import { ResultCard } from "./ResultCard";
import type { GeneratedResult } from "./types";

interface ResultsGridProps {
  results: GeneratedResult[];
  isGenerating: boolean;
  totalExpected?: number;
  showWatermark?: boolean;
  onShare?: () => void;
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

export function ResultsGrid({
  results,
  isGenerating,
  showWatermark = false,
  totalExpected,
}: ResultsGridProps) {
  const { t } = useLanguage();
  const [showAll, setShowAll] = useState(false);

  const displayResults = useMemo(() => {
    if (isGenerating) return results;
    return showAll ? results : filterBest(results);
  }, [results, isGenerating, showAll]);

  if (!isGenerating && results.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="mb-6 text-center text-[28px] leading-[1.10] font-semibold text-foreground sm:text-[32px] md:text-[40px]">
        {t("results")}
      </h2>

      {isGenerating && (
        <p className="mb-4 text-center text-sm text-muted-foreground">
          {totalExpected ? `Generating ${totalExpected} images...` : "Generating..."}
        </p>
      )}

      {!isGenerating && results.length > 0 && (
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

      {!isGenerating && results.length > 0 && (
        <p className="mt-6 text-center text-xs text-muted-foreground/60">
          {t("resultsSaved")}{" "}
          <a href="/my/generations" className="text-[#0071e3] hover:underline">
            {t("viewHistory")} →
          </a>
        </p>
      )}
    </div>
  );
}
