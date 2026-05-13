import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { authClient } from "@/lib/auth/auth-client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { createPageMeta } from "@/lib/seo/meta";

interface GenRecord {
  id: string;
  promptTemplate: string;
  resolvedPrompts: string[];
  variableGroups: Record<string, string[]>;
  resultUrls: string[];
  model: string;
  creditsUsed: number;
  createdAt: number;
}

const meta = createPageMeta({
  title: "My Generations — BatchlyAI",
  description: "View your AI generation history",
  path: "/my/generations",
  locale: "en",
  noIndex: true,
});

export const Route = createFileRoute("/my/generations")({
  head: () => ({
    htmlAttrs: { lang: "en" },
    meta: meta.meta,
    links: [{ rel: "canonical", href: "https://batchlyai.com/my/generations" }],
  }),
  component: GenerationsPage,
});

function GenerationsPage() {
  const { t } = useLanguage();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [generations, setGenerations] = useState<GenRecord[] | null>(null);
  const [selected, setSelected] = useState<GenRecord | null>(null);

  useEffect(() => {
    if (!session?.user) {
      return;
    }
    fetch("/api/generations?limit=50")
      .then((r) => r.json() as Promise<{ generations: GenRecord[] }>)
      .then((d) => setGenerations(d.generations || []))
      .catch(() => setGenerations([]));
  }, [session?.user]);

  if (sessionPending) {
    return (
      <main className="mx-auto max-w-[980px] px-4 py-16 text-center">
        <p className="text-muted-foreground">{t("loading")}</p>
      </main>
    );
  }

  if (!session?.user) {
    return (
      <main className="mx-auto max-w-[980px] px-4 py-16 text-center">
        <p className="text-muted-foreground">{t("pleaseLoginToView")}</p>
        <Link to="/login" className="mt-2 inline-block text-accent-blue">
          {t("loginNav")}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[980px] px-4 py-8">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        {t("backToGenerator")}
      </Link>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">{t("myGenerations")}</h1>

      {generations === null ? (
        <p className="text-muted-foreground">{t("loading")}</p>
      ) : generations.length === 0 ? (
        <p className="text-muted-foreground">{t("noGenerations")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {generations.map((gen) => (
            <button
              key={gen.id}
              onClick={() => setSelected(gen)}
              className="rounded-xl border bg-card p-4 text-left shadow-sm transition-shadow hover:shadow-md"
            >
              {gen.resultUrls[0] ? (
                <img
                  src={gen.resultUrls[0]}
                  alt={gen.promptTemplate}
                  className="mb-3 h-40 w-full rounded-lg object-cover"
                />
              ) : (
                <div className="mb-3 flex h-40 w-full items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                  {t("processing")}
                </div>
              )}
              <p className="line-clamp-2 text-sm font-medium text-foreground">
                {gen.promptTemplate}
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded bg-muted/50 px-1.5 py-0.5">{gen.model}</span>
                <span>
                  {gen.creditsUsed} {t("credits")}
                </span>
                <span>{new Date(gen.createdAt * 1000).toLocaleDateString()}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <button
          type="button"
          aria-label={t("close")}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-background p-6"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") setSelected(null);
            }}
          >
            <h2 className="mb-4 text-lg font-semibold">{t("generationDetail")}</h2>
            <p className="mb-4 text-sm text-muted-foreground">{selected.promptTemplate}</p>
            <div className="grid grid-cols-2 gap-2">
              {selected.resultUrls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={t("resultAlt", { index: i + 1 })}
                  className="rounded-lg object-cover"
                />
              ))}
            </div>
            <button
              onClick={() => setSelected(null)}
              className="mt-4 w-full rounded-lg bg-muted py-2 text-sm"
            >
              {t("close")}
            </button>
          </div>
        </button>
      )}
    </main>
  );
}
