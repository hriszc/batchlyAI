import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { authClient } from "@/lib/auth/auth-client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { createPageMeta } from "@/lib/seo/meta";

interface WorkRecord {
  id: string;
  title: string;
  coverUrl: string;
  category: string | null;
  likeCount: number;
  isPublished: number;
  createdAt: number;
}

const meta = createPageMeta({
  title: "My Works — BatchlyAI",
  description: "Manage your published works",
  path: "/my/works",
  locale: "en",
  noIndex: true,
});

export const Route = createFileRoute("/my/works")({
  head: () => ({
    htmlAttrs: { lang: "en" },
    meta: meta.meta,
    links: [{ rel: "canonical", href: "https://batchlyai.com/my/works" }],
  }),
  component: WorksPage,
});

function WorksPage() {
  const { t } = useLanguage();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [works, setWorks] = useState<WorkRecord[] | null>(null);

  useEffect(() => {
    if (!session?.user) {
      return;
    }
    fetch(`/api/works?userId=${session.user.id}`)
      .then((r) => r.json() as Promise<{ works: WorkRecord[] }>)
      .then((d) => setWorks(d.works || []))
      .catch(() => setWorks([]));
  }, [session?.user]);

  if (!session?.user) {
    return (
      <main className="mx-auto max-w-[980px] px-4 py-16 text-center">
        <p className="text-muted-foreground">{t("pleaseLoginToViewWorks")}</p>
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
        <ArrowLeftIcon className="size-4" /> {t("backToGenerator")}
      </Link>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">{t("myWorks")}</h1>

      {sessionPending || works === null ? (
        <p className="text-muted-foreground">{t("loading")}</p>
      ) : works.length === 0 ? (
        <p className="text-muted-foreground">{t("noWorksYet")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {works.map((w) => (
            <a
              key={w.id}
              href={`/works/${w.id}`}
              className="rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <img
                src={w.coverUrl}
                alt={w.title}
                className="mb-3 h-40 w-full rounded-lg object-cover"
              />
              <h3 className="font-medium text-foreground">{w.title}</h3>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                {w.category && (
                  <span className="rounded bg-muted/50 px-1.5 py-0.5">{w.category}</span>
                )}
                {!w.isPublished && (
                  <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-yellow-700">
                    {t("draft")}
                  </span>
                )}
                <span>{t("likesCount", { count: w.likeCount })}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
