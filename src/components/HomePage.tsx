import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { GeneratorCard } from "@/components/universal-generator/GeneratorCard";
import { ResultsGrid } from "@/components/universal-generator/ResultsGrid";
import { ShareScreenshot } from "@/components/universal-generator/ShareScreenshot";
import { useGeneratorState } from "@/components/universal-generator/useGeneratorState";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface HomePageProps {
  forceLanguage?: "en" | "zh";
}

export function HomePage({ forceLanguage }: HomePageProps) {
  const { state, actions } = useGeneratorState();
  const resultsRef = useRef<HTMLDivElement>(null);
  const { setLanguage, t } = useLanguage();
  const [shareMode, setShareMode] = useState(false);

  useEffect(() => {
    if (forceLanguage) {
      setLanguage(forceLanguage);
      document.documentElement.lang = forceLanguage === "zh" ? "zh-CN" : "en";
    }
  }, [forceLanguage, setLanguage]);

  // Handle ?template=<slug> for "Use this template" flow
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const templateSlug = params.get("template");
    if (!templateSlug) return;

    (async () => {
      try {
        const resp = await fetch(`/api/templates/${templateSlug}`);
        const data = (await resp.json()) as {
          error?: string;
          promptTemplate?: string;
          variableGroups?: Array<{ values: string[] }>;
          model?: string;
          aspectRatio?: string;
        };
        if (data.error || !data.promptTemplate) return;

        actions.setPromptTemplate(data.promptTemplate);
        setTimeout(() => {
          const groups = data.variableGroups;
          if (!groups) return;
          groups.forEach((group, i) => {
            group.values.forEach((value, j) => {
              actions.updateValue(`var_${i}`, j, value);
            });
          });
          if (data.model) actions.setModel(data.model);
          if (data.aspectRatio) actions.setAspectRatio(data.aspectRatio);
        }, 600);

        const url = new URL(window.location.href);
        url.searchParams.delete("template");
        window.history.replaceState({}, "", url.toString());
      } catch {
        // Non-critical
      }
    })();
  }, []);

  // Handle ?loadPrompt=<id> for "Load" from /my/prompts
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const loadId = params.get("loadPrompt");
    if (!loadId) return;

    (async () => {
      try {
        const resp = await fetch(`/api/prompts?search=${encodeURIComponent(loadId)}`);
        const data = (await resp.json()) as {
          prompts?: Array<{
            id: string;
            promptTemplate: string;
            variableGroups?: Array<{ values: string[] }>;
            model?: string;
          }>;
        };
        const prompt = data.prompts?.find((p) => p.id === loadId);
        if (!prompt?.promptTemplate) return;

        actions.setPromptTemplate(prompt.promptTemplate);
        setTimeout(() => {
          const groups = prompt.variableGroups;
          if (!groups) return;
          groups.forEach((group, i) => {
            group.values.forEach((value, j) => {
              actions.updateValue(`var_${i}`, j, value);
            });
          });
          if (prompt.model) actions.setModel(prompt.model);
        }, 600);

        const url = new URL(window.location.href);
        url.searchParams.delete("loadPrompt");
        window.history.replaceState({}, "", url.toString());
      } catch {
        // Non-critical
      }
    })();
  }, []);

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
      <div className="mb-2 flex justify-center">
        <img
          src="/logo-light.png"
          alt="BatchlyAI"
          className="block h-12 w-auto sm:h-14 md:h-16 dark:hidden"
        />
        <img
          src="/logo-dark.png"
          alt="BatchlyAI"
          className="hidden h-12 w-auto sm:h-14 md:h-16 dark:block"
        />
      </div>
      <h1 className="sr-only">{t("siteTitle")}</h1>
      <p className="mb-8 text-center text-[17px] leading-[1.19] tracking-[-0.022em] text-muted-foreground sm:text-[21px]">
        {t("siteDescription")}
      </p>

      <GeneratorCard state={state} actions={actions} />

      <div ref={resultsRef}>
        <ResultsGrid
          results={state.results}
          isGenerating={state.isGenerating}
          onShare={() => {
            if (state.results.length === 0) return;
            setShareMode(true);
          }}
        />
      </div>

      {shareMode && (
        <ShareScreenshot
          promptTemplate={state.promptTemplate}
          variableGroups={state.variableGroups}
          results={state.results}
          onComplete={() => {
            setShareMode(false);
            toast.success(t("shareSuccess"));
          }}
          onError={(msg) => {
            setShareMode(false);
            toast.error(t("shareFailed"));
            console.error("[share]", msg);
          }}
        />
      )}
    </main>
  );
}
