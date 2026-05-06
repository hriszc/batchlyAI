import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { GeneratorCard } from "@/components/universal-generator/GeneratorCard";
import { ResultsGrid } from "@/components/universal-generator/ResultsGrid";
import { ShareScreenshot } from "@/components/universal-generator/ShareScreenshot";
import { useGeneratorState } from "@/components/universal-generator/useGeneratorState";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { authClient } from "@/lib/auth/auth-client";

interface HomePageProps {
  forceLanguage?: "en" | "zh";
}

export function HomePage({ forceLanguage }: HomePageProps) {
  const { state, actions } = useGeneratorState();
  const resultsRef = useRef<HTMLDivElement>(null);
  const { setLanguage, t } = useLanguage();
  const [shareMode, setShareMode] = useState(false);

  const { data: session } = authClient.useSession();
  const isLoggedIn = !!session?.user;

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

      {!hasResults && !isLoggedIn && (
        <DiscoverSection cta={t("signupToCreate")} discoverTitle={t("discoverCTA")} />
      )}
    </main>
  );
}

function DiscoverSection({
  cta,
  discoverTitle,
}: {
  cta: string;
  discoverTitle: string;
}) {
  const [works, setWorks] = useState<Array<{
    slug: string;
    name: string;
    description: string;
    previewImageUrl: string | null;
    usageCount: number;
  }> | null>(null);

  useEffect(() => {
    fetch("/api/templates?limit=6")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setWorks(data.templates);
      })
      .catch(() => {});
  }, []);

  if (!works || works.length === 0) return null;

  return (
    <section className="mt-16">
      <h2 className="mb-4 text-xl font-semibold">{discoverTitle}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {works.slice(0, 6).map((w) => (
          <Link
            key={w.slug}
            to="/templates/$slug"
            params={{ slug: w.slug }}
            className="group overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="aspect-[16/10] bg-muted">
              {w.previewImageUrl ? (
                <img src={w.previewImageUrl} alt={w.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground/30">
                  No preview
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-medium group-hover:text-[#0071e3]">{w.name}</h3>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{w.description}</p>
              <span className="mt-2 inline-block text-[10px] text-muted-foreground">
                {w.usageCount} uses
              </span>
            </div>
          </Link>
        ))}
      </div>
      <div className="mt-6 text-center">
        <a
          href="/signup"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#0071e3] px-6 text-sm font-medium text-white transition-colors hover:bg-[#0077ed]"
        >
          {cta}
        </a>
      </div>
    </section>
  );
}
