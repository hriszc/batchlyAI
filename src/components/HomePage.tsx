import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { LoginCard } from "@/components/LoginCard";
import { FaqSection } from "@/components/seo/FaqSection";
import { GeneratorCard } from "@/components/universal-generator/GeneratorCard";
import { ResultsGrid } from "@/components/universal-generator/ResultsGrid";
import { ShareScreenshot } from "@/components/universal-generator/ShareScreenshot";
import { useGeneratorState } from "@/components/universal-generator/useGeneratorState";
import { computePromptCombinations } from "@/components/universal-generator/utils";
import { useAuthGate } from "@/components/useAuthGate";
import { authClient } from "@/lib/auth/auth-client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  buildCnRedirectHref,
  isChineseLanguageTag,
  parseStoredLanguage,
} from "@/lib/i18n/locale-routing";
import type { TranslationKey } from "@/lib/i18n/translations";
import { getHomepageFaq } from "@/lib/seo/geo-content";

export function shouldRedirectToCn(): boolean {
  if (typeof window === "undefined") return false;
  if (window.location.pathname.startsWith("/cn")) return false;
  try {
    const saved = parseStoredLanguage(localStorage.getItem("language"));
    if (saved === "en") return false;
    if (saved === "zh") return true;
  } catch {}
  const preferred = navigator.languages?.[0] || navigator.language || "";
  return isChineseLanguageTag(preferred);
}

interface HomePageProps {
  forceLanguage?: "en" | "zh";
  showTaaftBadge?: boolean;
}

const STARTER_TEMPLATES = [
  {
    label: "Product hero",
    prompt: "A studio product photo of {{sneakers, headphones}} on {{marble, glass}}",
  },
  {
    label: "Social ad",
    prompt: "{{Minimal, cinematic}} poster for {{coffee, skincare}} with bold typography",
  },
  {
    label: "Character set",
    prompt: "A {{robot, astronaut}} character in {{pixel art, watercolor}} style",
  },
];

const HOMEPAGE_EXAMPLE_MODEL = "Image Pro";
const HOMEPAGE_EXAMPLE_RESULTS = [
  "/examples/one-piece-cosplay/result-1.webp",
  "/examples/one-piece-cosplay/result-2.webp",
  "/examples/one-piece-cosplay/result-3.webp",
  "/examples/one-piece-cosplay/result-4.webp",
  "/examples/one-piece-cosplay/result-5.webp",
];

function HomepageExample({ t }: { t: (key: TranslationKey) => string }) {
  return (
    <section
      className="mx-auto w-full max-w-[1180px] px-4 pt-6 pb-14 sm:pt-10 sm:pb-20"
      aria-labelledby="homepage-example-title"
    >
      <div className="border-y border-border/70 py-8 sm:py-10 lg:py-12">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_440px] lg:items-end">
          <div className="space-y-4">
            <div className="text-xs font-semibold tracking-[0.18em] text-accent-blue uppercase">
              {t("homepageExampleEyebrow")}
            </div>
            <h2
              id="homepage-example-title"
              className="max-w-2xl text-3xl leading-tight font-semibold tracking-[-0.02em] text-foreground sm:text-4xl"
            >
              {t("homepageExampleTitle")}
            </h2>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground">
              {t("homepageExampleDescription")}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
            <div className="rounded-lg border bg-background p-4">
              <div className="mb-2 text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                {t("homepageExamplePromptLabel")}
              </div>
              <div className="font-mono text-sm leading-6 break-words text-foreground">
                {t("homepageExamplePromptValue")}
              </div>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <div className="mb-2 text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                {t("homepageExampleModelLabel")}
              </div>
              <div className="text-sm font-semibold text-foreground">{HOMEPAGE_EXAMPLE_MODEL}</div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 items-start gap-4 lg:grid-cols-12">
          <figure className="relative col-span-2 overflow-hidden rounded-lg border bg-muted lg:col-span-4">
            <img
              src="/examples/one-piece-cosplay/input.webp"
              alt={t("homepageExampleInputAlt")}
              width={640}
              height={640}
              loading="lazy"
              decoding="async"
              sizes="(min-width: 1024px) 380px, 100vw"
              className="aspect-square w-full object-cover"
            />
            <figcaption className="absolute bottom-3 left-3 rounded-md bg-background/90 px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur">
              {t("homepageExampleInputLabel")}
            </figcaption>
          </figure>

          {HOMEPAGE_EXAMPLE_RESULTS.map((src, index) => {
            const isFeatured = index === 0;
            return (
              <figure
                key={src}
                className={`relative overflow-hidden rounded-lg border bg-muted ${
                  isFeatured ? "col-span-2 lg:col-span-8" : "col-span-1 lg:col-span-3"
                }`}
              >
                <img
                  src={src}
                  alt={t("homepageExampleOutputAlt")}
                  width={960}
                  height={540}
                  loading="lazy"
                  decoding="async"
                  sizes={
                    isFeatured
                      ? "(min-width: 1024px) 760px, 100vw"
                      : "(min-width: 1024px) 280px, 50vw"
                  }
                  className="aspect-[16/9] w-full object-cover"
                />
                {isFeatured && (
                  <figcaption className="absolute bottom-3 left-3 rounded-md bg-background/90 px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur">
                    {t("homepageExampleOutputLabel")}
                  </figcaption>
                )}
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function HomePage({ forceLanguage, showTaaftBadge = false }: HomePageProps) {
  const { state, actions } = useGeneratorState();
  const resultsRef = useRef<HTMLDivElement>(null);
  const { language, setLanguage, t } = useLanguage();
  const [hydrated, setHydrated] = useState(false);
  const [shareMode, setShareMode] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const handlePublish = useCallback(async () => {
    if (publishing || state.results.length === 0) return;
    const coverUrl = state.results.find((r) => r.imageUrl)?.imageUrl;
    const resultUrls = state.results.filter((r) => r.imageUrl).map((r) => r.imageUrl!);
    if (!coverUrl || resultUrls.length === 0) {
      toast.error(t("resultFailed"));
      return;
    }
    setPublishing(true);
    const publishToastId = toast.loading(t("publishing"));
    try {
      const body = {
        coverUrl,
        resultUrls,
        promptTemplate: state.promptTemplate,
        variableGroups: JSON.stringify(state.variableGroups),
        model: state.model,
        aspectRatio: state.aspectRatio,
      };
      const resp = await fetch("/api/works", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (resp.ok) {
        const workData = (await resp.json()) as {
          coverUrl?: string;
          resultUrls?: string[];
        };
        const publicCoverUrl = workData.coverUrl || coverUrl;
        const publicResultUrls = workData.resultUrls?.length ? workData.resultUrls : resultUrls;
        // Auto-save as template
        void fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            promptTemplate: state.promptTemplate,
            variableGroups: JSON.stringify(state.variableGroups),
            model: state.model,
            aspectRatio: state.aspectRatio,
            previewImageUrl: publicCoverUrl,
            coverUrl: publicCoverUrl,
            resultUrls: publicResultUrls,
          }),
        }).catch(() => {});
        toast.success(t("publishSuccess"), {
          id: publishToastId,
          action: {
            label: t("discover"),
            onClick: () => {
              window.location.href = "/discover?tab=new";
            },
          },
        });
      } else {
        const errBody = (await resp.json().catch(() => ({}))) as { error?: string };
        toast.error(errBody.error || t("publishFailed"), { id: publishToastId });
      }
    } catch {
      toast.error(t("publishFailed"), { id: publishToastId });
    } finally {
      setPublishing(false);
    }
  }, [
    publishing,
    state.promptTemplate,
    state.results,
    state.variableGroups,
    state.model,
    state.aspectRatio,
    t,
  ]);
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const sessionReady = hydrated && !sessionLoading;
  const visibleSession = sessionReady ? session : null;
  const visibleUser = visibleSession?.user;
  const userCredits = ((visibleUser as Record<string, unknown>)?.credits as number) ?? 0;
  const effectiveCredits = state.creditsRemaining ?? userCredits;
  const showWatermark = effectiveCredits <= 10;
  const authGate = useAuthGate();
  const isLoggedIn = !!visibleUser;
  const canGuestGenerate = !isLoggedIn;
  const { setPromptTemplate, updateValue, setAspectRatio, setModel } = actions;
  const homepageFaq = getHomepageFaq(language);

  useEffect(() => {
    // Keep the first client render aligned with SSR to avoid hydration remounts
    // when auth state resolves before the page finishes hydrating.
    // oxlint-disable-next-line react-hooks-js/set-state-in-effect
    setHydrated(true);
  }, []);

  // Restore pending prompt from sessionStorage (preserved across login redirect)
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem("pendingPrompt");
      if (pending) {
        setPromptTemplate(pending);
        sessionStorage.removeItem("pendingPrompt");
      }
    } catch {}
  }, [setPromptTemplate]);

  // Save prompt to sessionStorage so it survives login redirect
  useEffect(() => {
    if (!state.promptTemplate) return;
    try {
      sessionStorage.setItem("pendingPrompt", state.promptTemplate);
    } catch {}
  }, [state.promptTemplate]);

  // Server routing normally handles this. Keep a client fallback for static
  // previews and client-only navigations where the first request did not run.
  useEffect(() => {
    if (forceLanguage === "zh" || !shouldRedirectToCn()) return;
    const target = buildCnRedirectHref(window.location.search, window.location.hash);
    if (window.location.pathname !== "/cn") {
      window.location.replace(target);
    }
  }, [forceLanguage]);

  useEffect(() => {
    if (forceLanguage) {
      setLanguage(forceLanguage, { persist: false });
      document.documentElement.lang = forceLanguage === "zh" ? "zh-CN" : "en";
    }
  }, [forceLanguage, setLanguage]);

  useEffect(() => {
    if (!sessionReady) return;
    if (!isLoggedIn && state.model !== "z-image-fast") {
      setModel("z-image-fast");
    }
  }, [isLoggedIn, sessionReady, setModel, state.model]);

  // Handle ?template=<slug> for "Use this template" flow
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const templateSlug = params.get("template");
    if (!templateSlug) return;

    void (async () => {
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

        setPromptTemplate(data.promptTemplate);
        setTimeout(() => {
          const groups = data.variableGroups;
          if (!groups) return;
          groups.forEach((group, i) => {
            group.values.forEach((value, j) => {
              updateValue(`var_${i}`, j, value);
            });
          });
          if (data.model) setModel(data.model);
          if (data.aspectRatio) setAspectRatio(data.aspectRatio);
        }, 600);

        const url = new URL(window.location.href);
        url.searchParams.delete("template");
        window.history.replaceState({}, "", url.toString());
      } catch {
        // Non-critical
      }
    })();
  }, [setPromptTemplate, setAspectRatio, setModel, updateValue]);

  // Handle ?remix=<workId> for remix flow
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const remixId = params.get("remix");
    if (!remixId) return;

    void (async () => {
      try {
        const resp = await fetch(`/api/works?remix=${remixId}`);
        const data = (await resp.json()) as {
          promptTemplate?: string;
          variableGroups?: string;
          model?: string;
        };
        if (!data.promptTemplate) return;

        setPromptTemplate(data.promptTemplate);
        setTimeout(() => {
          try {
            const groups = JSON.parse(data.variableGroups || "[]") as Array<{ values: string[] }>;
            groups.forEach((group, i) => {
              group.values.forEach((value, j) => {
                updateValue(`var_${i}`, j, value);
              });
            });
          } catch {}
          if (data.model) setModel(data.model);
        }, 600);

        const url = new URL(window.location.href);
        url.searchParams.delete("remix");
        window.history.replaceState({}, "", url.toString());
      } catch {
        /* Non-critical */
      }
    })();
  }, [setPromptTemplate, setModel, updateValue]);

  const prevGeneratingRef = useRef(state.isGenerating);
  useEffect(() => {
    if (prevGeneratingRef.current && !state.isGenerating && state.results.length > 0) {
      toast.success(`${state.results.length} images ready!`);
      if (resultsRef.current) {
        resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
    prevGeneratingRef.current = state.isGenerating;
  }, [state.isGenerating, state.results]);

  const hasResults = state.results.length > 0;

  return (
    <main>
      <section
        className={`mx-auto max-w-[980px] px-4 ${
          hasResults ? "pt-8 pb-8" : "flex min-h-[100svh] flex-col justify-center py-10 sm:py-14"
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

        <GeneratorCard
          state={state}
          actions={actions}
          onRequireAuth={authGate.checkAuth}
          canGuestGenerate={canGuestGenerate}
          canExpandVars={isLoggedIn}
          isGuest={canGuestGenerate}
          availableCredits={effectiveCredits}
          isSessionReady={sessionReady}
        />

        {!state.promptTemplate.trim() && state.results.length === 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {t("promptTemplates")}
            </span>
            {STARTER_TEMPLATES.map((starter) => (
              <button
                key={starter.label}
                type="button"
                onClick={() => setPromptTemplate(starter.prompt)}
                className="rounded-full border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-accent-blue/40 hover:text-accent-blue"
              >
                {starter.label}
              </button>
            ))}
          </div>
        )}

        <div ref={resultsRef}>
          <ResultsGrid
            results={state.results}
            isGenerating={state.isGenerating}
            totalExpected={
              computePromptCombinations(state.promptTemplate, state.variableGroups).length *
              state.quantity
            }
            showWatermark={showWatermark}
            onShare={() => {
              if (state.results.length === 0) return;
              setShareMode(true);
            }}
            onPublish={isLoggedIn ? handlePublish : undefined}
            isPublishing={publishing}
          />
        </div>
      </section>

      <HomepageExample t={t} />

      {showTaaftBadge && (
        <section className="mx-auto flex max-w-[980px] justify-center px-4 pb-12">
          <a
            href="https://theresanaiforthat.com/ai/batchlyai/?ref=featured&v=8086392"
            target="_blank"
            rel="nofollow"
          >
            <img
              width="300"
              height="100"
              src="https://media.theresanaiforthat.com/featured-on-taaft.png?width=600"
              alt="Featured on There's An AI For That"
              loading="lazy"
              decoding="async"
            />
          </a>
        </section>
      )}

      <section className="mx-auto max-w-[980px] px-4 pb-16">
        <FaqSection
          title={t("homepageFaqTitle")}
          description={t("homepageFaqDescription")}
          items={homepageFaq}
        />
      </section>

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

      {authGate.showLoginCard && (
        <LoginCard onSuccess={authGate.onLoginSuccess} onClose={authGate.closeLogin} />
      )}
    </main>
  );
}
