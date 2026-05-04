import type { GeneratedResult } from "./types";
import { ResultCard } from "./ResultCard";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface ResultsGridProps {
  results: GeneratedResult[];
  isGenerating: boolean;
}

function SkeletonCard() {
  return (
    <div className="bg-card rounded-[8px] overflow-hidden border animate-pulse">
      <div className="aspect-square bg-muted" />
      <div className="px-4 pt-4 pb-4 space-y-2">
        <div className="h-4 bg-muted-foreground/10 rounded w-3/4" />
        <div className="h-3 bg-muted-foreground/5 rounded w-1/2" />
      </div>
    </div>
  );
}

export function ResultsGrid({ results, isGenerating }: ResultsGridProps) {
  const { t } = useLanguage();

  if (!isGenerating && results.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="text-foreground text-[28px] sm:text-[32px] md:text-[40px] font-semibold leading-[1.10] text-center mb-6">
        {t("results")}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {isGenerating
          ? Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))
          : results.map((result) => (
              <ResultCard key={result.id} result={result} />
            ))}
      </div>
    </div>
  );
}
