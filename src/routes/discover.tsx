import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { hreflangLinks } from "@/lib/seo/hreflang";
import { createPageMeta } from "@/lib/seo/meta";

interface WorkCard {
  id: string;
  title: string;
  coverUrl: string;
  authorName?: string;
  likeCount: number;
  remixCount: number;
  category: string | null;
}

interface TemplateCard {
  slug: string;
  name: string;
  description: string;
  category: string;
  previewImageUrl: string | null;
  usageCount: number;
}

const TABS = ["hot", "new", "ecommerce", "art", "social-media", "marketing", "templates"] as const;
type DiscoverTab = (typeof TABS)[number];

const TAB_LABELS: Record<DiscoverTab, string> = {
  hot: "Hot",
  new: "New",
  ecommerce: "Ecommerce",
  art: "Art",
  "social-media": "Social media",
  marketing: "Marketing",
  templates: "Templates",
};

function normalizeDiscoverTab(tab: unknown): DiscoverTab {
  return typeof tab === "string" && TABS.includes(tab as DiscoverTab)
    ? (tab as DiscoverTab)
    : "hot";
}

const meta = createPageMeta({
  title: "Discover — BatchlyAI",
  description: "Discover AI-generated works and remix them",
  path: "/discover",
  locale: "en",
});

export const Route = createFileRoute("/discover")({
  validateSearch: (search: Record<string, unknown>) => {
    const tab = normalizeDiscoverTab(search.tab);
    return tab === "hot" ? {} : { tab };
  },
  head: () => ({
    htmlAttrs: { lang: "en" },
    meta: meta.meta,
    links: [
      ...hreflangLinks("/discover"),
      { rel: "canonical", href: "https://batchlyai.com/discover" },
    ],
  }),
  component: DiscoverPage,
});

function DiscoverPage() {
  const { t } = useLanguage();
  const navigate = Route.useNavigate();
  const { tab } = Route.useSearch();
  const activeTab = tab ?? "hot";
  const [works, setWorks] = useState<WorkCard[]>([]);
  const [templates, setTemplates] = useState<TemplateCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // oxlint-disable-next-line react-hooks-js/set-state-in-effect
    setLoading(true);

    if (activeTab === "templates") {
      fetch("/api/templates?limit=20")
        .then((r) => r.json() as Promise<{ templates: TemplateCard[] }>)
        .then((d) => setTemplates(d.templates || []))
        .catch(() => setTemplates([]))
        .finally(() => setLoading(false));
      return;
    }

    const type = activeTab === "hot" || activeTab === "new" ? activeTab : "";
    const category = ["ecommerce", "art", "social-media", "marketing"].includes(activeTab)
      ? activeTab
      : "";
    const params = new URLSearchParams({ type, ...(category && { category }) });
    fetch(`/api/works?${params}`)
      .then((r) => r.json() as Promise<{ works: WorkCard[] }>)
      .then((d) => setWorks(d.works || []))
      .catch(() => setWorks([]))
      .finally(() => setLoading(false));
  }, [activeTab]);

  return (
    <main className="mx-auto max-w-[980px] px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold text-foreground">{t("discover")}</h1>
      <div className="mb-6 flex gap-1.5 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() =>
              void navigate({
                to: "/discover",
                search: tab === "hot" ? {} : { tab },
                replace: true,
              })
            }
            className={`rounded-lg px-3 py-1.5 text-sm whitespace-nowrap ${activeTab === tab ? "bg-accent-blue text-white" : "bg-muted/30 text-muted-foreground hover:bg-muted"}`}
          >
            {tab === "hot" || tab === "new" || tab === "templates" ? t(tab) : TAB_LABELS[tab]}
          </button>
        ))}
      </div>
      {loading ? (
        <p className="text-muted-foreground">{t("loading")}</p>
      ) : activeTab === "templates" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Link
              key={template.slug}
              to="/templates/$slug"
              params={{ slug: template.slug }}
              className="group overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="aspect-[16/10] bg-muted">
                {template.previewImageUrl ? (
                  <img
                    src={template.previewImageUrl}
                    alt={template.name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground/40">
                    {t("promptTemplates")}
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-medium group-hover:text-accent-blue">{template.name}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {template.description}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    {template.category}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {template.usageCount} uses
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {works.map((w) => (
            <a
              key={w.id}
              href={`/works/${w.id}`}
              className="group rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="aspect-square overflow-hidden rounded-t-xl">
                <img
                  src={w.coverUrl}
                  alt={w.title}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              </div>
              <div className="p-3">
                <p className="line-clamp-1 text-sm font-medium text-foreground">{w.title}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  {w.authorName && <span>{w.authorName}</span>}
                  <span>{w.likeCount} likes</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
