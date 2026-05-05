import { authClient } from "@/lib/auth/auth-client";
import { useLanguage } from "@/lib/i18n/LanguageContext";

import { ResultCard } from "./ResultCard";
import type { GeneratedResult } from "./types";

interface ResultsGridProps {
  results: GeneratedResult[];
  isGenerating: boolean;
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

export function ResultsGrid({ results, isGenerating }: ResultsGridProps) {
  const { t } = useLanguage();
  const { data: session } = authClient.useSession();
  const userCredits = ((session?.user as Record<string, unknown>)?.credits as number) ?? 0;
  const showWatermark = userCredits <= 10;

  if (!isGenerating && results.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="mb-6 text-center text-[28px] leading-[1.10] font-semibold text-foreground sm:text-[32px] md:text-[40px]">
        {t("results")}
      </h2>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {isGenerating
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : results.map((result) => (
              <ResultCard key={result.id} result={result} showWatermark={showWatermark} />
            ))}
      </div>
    </div>
  );
}
