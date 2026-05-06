import { createFileRoute } from "@tanstack/react-router";
import {
  FlameIcon,
  ClockIcon,
  ShoppingBagIcon,
  PaletteIcon,
  UsersIcon,
  MegaphoneIcon,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";

import { DiscoverCard } from "@/components/DiscoverCard";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { createPageMeta } from "@/lib/seo/meta";

interface WorkItem {
  id: string;
  resultImageUrl: string;
  title: string;
  userName: string;
  likeCount: number;
  remixCount: number;
}

type TabKey = "hot" | "new" | "ecommerce" | "art" | "social_media" | "marketing";

const TAB_LABELS: Record<TabKey, string> = {
  hot: "hot",
  new: "new",
  ecommerce: "modelImage",
  art: "art",
  social_media: "socialMedia",
  marketing: "marketing",
};

const TABS: { key: TabKey; Icon: typeof FlameIcon; labelKey: string }[] = [
  { key: "hot", Icon: FlameIcon, labelKey: TAB_LABELS.hot },
  { key: "new", Icon: ClockIcon, labelKey: TAB_LABELS.new },
  {
    key: "ecommerce",
    Icon: ShoppingBagIcon,
    labelKey: TAB_LABELS.ecommerce,
  },
  { key: "art", Icon: PaletteIcon, labelKey: TAB_LABELS.art },
  { key: "social_media", Icon: UsersIcon, labelKey: TAB_LABELS.social_media },
  { key: "marketing", Icon: MegaphoneIcon, labelKey: TAB_LABELS.marketing },
];

function DiscoverPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabKey>("hot");
  const [works, setWorks] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorks = useCallback(async (tab: TabKey) => {
    setLoading(true);
    try {
      const category = ["ecommerce", "art", "social_media", "marketing"].includes(tab)
        ? tab
        : undefined;
      const sort = tab === "new" ? "new" : "hot";
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      params.set("sort", sort);
      params.set("limit", "20");

      const resp = await fetch(`/api/works?${params.toString()}`);
      const data = (await resp.json()) as { works?: WorkItem[]; error?: string };
      if (data.works) setWorks(data.works);
    } catch {
      // Silently handle error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchWorks(activeTab);
  }, [activeTab, fetchWorks]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">{t("discover")}</h1>
      <p className="mt-2 text-muted-foreground">{t("siteDescription")}</p>

      {/* Tabs */}
      <div className="mt-8 flex flex-wrap items-center gap-2 border-b pb-2">
        {TABS.map(({ key, Icon, labelKey }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${
              activeTab === key
                ? "bg-[#0071e3] text-white shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="size-3.5" />
            {t(labelKey as never)}
          </button>
        ))}
      </div>

      {/* Works grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-[#0071e3]" />
        </div>
      ) : works.length === 0 ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <p className="text-muted-foreground">{t("noComments")}</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {works.map((w) => (
            <DiscoverCard
              key={w.id}
              workId={w.id}
              coverUrl={w.resultImageUrl}
              title={w.title}
              authorName={w.userName}
              likeCount={w.likeCount}
              remixCount={w.remixCount}
            />
          ))}
        </div>
      )}
    </main>
  );
}

const seo = createPageMeta({
  title: "Discover — BatchlyAI",
  description: "Discover AI-generated works and remix them",
  path: "/discover",
  locale: "en",
});

export const Route = createFileRoute("/discover")({
  head: () => ({
    htmlAttrs: { lang: "en" },
    meta: seo.meta,
    links: seo.links,
    scripts: seo.scripts,
  }),
  component: DiscoverPage,
});
