import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { createPageMeta } from "@/lib/seo/meta";
import { hreflangLinks } from "@/lib/seo/hreflang";

interface WorkCard {
  id: string;
  title: string;
  coverUrl: string;
  authorName?: string;
  likeCount: number;
  remixCount: number;
  category: string | null;
}

const TABS = ["hot", "new", "ecommerce", "art", "social-media", "marketing"] as const;

const meta = createPageMeta({
  title: "Discover — BatchlyAI",
  description: "Discover AI-generated works and remix them",
  path: "/discover", locale: "en",
});

// @ts-expect-error route tree auto-generated at build time
export const Route = createFileRoute("/discover")({
  head: () => ({
    htmlAttrs: { lang: "en" },
    meta: meta.meta,
    links: [...hreflangLinks("/discover"), { rel: "canonical", href: "https://batchlyai.com/discover" }],
  }),
  component: DiscoverPage,
});

function DiscoverPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<string>("hot");
  const [works, setWorks] = useState<WorkCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const type = activeTab === "hot" || activeTab === "new" ? activeTab : "";
    const category = ["ecommerce", "art", "social-media", "marketing"].includes(activeTab) ? activeTab : "";
    const params = new URLSearchParams({ type, ...(category && { category }) });
    fetch(`/api/works?${params}`)
      .then(r => r.json() as Promise<{ works: WorkCard[] }>)
      .then(d => setWorks(d.works || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeTab]);

  return (
    <main className="mx-auto max-w-[980px] px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold text-foreground">{t("discover")}</h1>
      <div className="mb-6 flex gap-1.5 overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-3 py-1.5 text-sm whitespace-nowrap ${activeTab === tab ? "bg-[#0071e3] text-white" : "bg-muted/30 text-muted-foreground hover:bg-muted"}`}>
            {t(tab as keyof typeof t extends infer K ? K : never) || tab}
          </button>
        ))}
      </div>
      {loading ? <p className="text-muted-foreground">Loading...</p>
      : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {works.map(w => (
            <Link key={w.id} to="/works/$workId" params={{ workId: w.id }} className="group rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md">
              <div className="aspect-square overflow-hidden rounded-t-xl">
                <img src={w.coverUrl} alt={w.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
              </div>
              <div className="p-3">
                <p className="line-clamp-1 text-sm font-medium text-foreground">{w.title}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  {w.authorName && <span>{w.authorName}</span>}
                  <span>{w.likeCount} likes</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
