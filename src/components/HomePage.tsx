import { useEffect, useRef } from "react";

import { GeneratorCard } from "@/components/universal-generator/GeneratorCard";
import { ResultsGrid } from "@/components/universal-generator/ResultsGrid";
import { useGeneratorState } from "@/components/universal-generator/useGeneratorState";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface HomePageProps {
  forceLanguage?: "en" | "zh";
}

export function HomePage({ forceLanguage }: HomePageProps) {
  const { state, actions } = useGeneratorState();
  const resultsRef = useRef<HTMLDivElement>(null);
  const { setLanguage, t } = useLanguage();

  useEffect(() => {
    if (forceLanguage) {
      setLanguage(forceLanguage);
      document.documentElement.lang = forceLanguage === "zh" ? "zh-CN" : "en";
    }
  }, [forceLanguage, setLanguage]);

  useEffect(() => {
    if (!state.isGenerating && state.results.length > 0 && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [state.isGenerating, state.results]);

  const hasResults = state.results.length > 0;

  return (
    <main
      className={`mx-auto max-w-[980px] px-4 pb-16 ${
        hasResults ? "pt-8" : "flex min-h-[90vh] flex-col justify-center"
      }`}
    >
      <h1 className="mb-2 text-center text-[32px] leading-[1.07] font-semibold tracking-[-0.028em] text-foreground sm:text-[40px] md:text-[56px]">
        {t("siteTitle")}
      </h1>
      <p className="mb-8 text-center text-[17px] leading-[1.19] tracking-[-0.022em] text-muted-foreground sm:text-[21px]">
        {t("siteDescription")}
      </p>

      <GeneratorCard state={state} actions={actions} />

      <div ref={resultsRef}>
        <ResultsGrid results={state.results} isGenerating={state.isGenerating} />
      </div>
    </main>
  );
}
