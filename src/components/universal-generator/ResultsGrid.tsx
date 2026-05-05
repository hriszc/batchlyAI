import { Share2Icon } from "lucide-react";

import { useLanguage } from "@/lib/i18n/LanguageContext";

import { ResultCard } from "./ResultCard";
import type { GeneratedResult } from "./types";

interface ResultsGridProps {
  results: GeneratedResult[];
  isGenerating: boolean;
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

export function ResultsGrid({ results, isGenerating, onShare }: ResultsGridProps) {
  const { t } = useLanguage();

  if (!isGenerating && results.length === 0) return null;

  return (
    <div className="mt-8">
      <div className="mb-6 flex items-center justify-center gap-4">
        <h2 className="text-center text-[28px] leading-[1.10] font-semibold text-foreground sm:text-[32px] md:text-[40px]">
          {t("results")}
        </h2>
        {!isGenerating && results.length > 0 && onShare && (
          <button
            onClick={onShare}
            title={t("shareScreenshot")}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#0071e3]/10 px-3 py-1.5 text-xs font-medium text-[#0071e3] backdrop-blur-sm transition-colors hover:bg-[#0071e3]/25"
          >
            <Share2Icon className="size-3" />
            {t("shareScreenshot")}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {isGenerating
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : results.map((result) => <ResultCard key={result.id} result={result} />)}
      </div>
    </div>
  );
}
