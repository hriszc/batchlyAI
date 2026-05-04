import { useEffect, useRef } from "react";
import { useGeneratorState } from "@/components/universal-generator/useGeneratorState";
import { GeneratorCard } from "@/components/universal-generator/GeneratorCard";
import { ResultsGrid } from "@/components/universal-generator/ResultsGrid";
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
      className={`max-w-[980px] mx-auto px-4 pb-16 ${
        hasResults ? "pt-8" : "min-h-[90vh] flex flex-col justify-center"
      }`}
    >
      <h1 className="text-foreground text-[32px] sm:text-[40px] md:text-[56px] font-semibold leading-[1.07] tracking-[-0.028em] text-center mb-2">
        {t("siteTitle")}
      </h1>
      <p className="text-muted-foreground text-[17px] sm:text-[21px] leading-[1.19] tracking-[-0.022em] text-center mb-8">
        {t("siteDescription")}
      </p>

      <GeneratorCard state={state} actions={actions} />

      <div ref={resultsRef}>
        <ResultsGrid results={state.results} isGenerating={state.isGenerating} />
      </div>
    </main>
  );
}
