import { createFileRoute } from "@tanstack/react-router";
import { ArrowRightIcon } from "lucide-react";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { hreflangLinks } from "@/lib/seo/hreflang";
import { createPageMeta } from "@/lib/seo/meta";

const meta = createPageMeta({
  title: "Templates in Discover — BatchlyAI",
  description:
    "Browse AI prompt templates alongside real community results, so the same page can be used to compare ideas and launch from proven examples.",
  path: "/discover?tab=templates",
  locale: "en",
  noIndex: true,
});

export const Route = createFileRoute("/templates/")({
  head: () => ({
    htmlAttrs: { lang: "en" },
    meta: meta.meta,
    links: [
      ...hreflangLinks("/discover?tab=templates"),
      { rel: "canonical", href: "https://batchlyai.com/discover?tab=templates" },
    ],
  }),
  component: TemplatesPage,
});

function TemplatesPage() {
  const { t } = useLanguage();

  return (
    <main className="mx-auto max-w-[720px] px-4 py-16">
      <p className="text-sm font-medium text-accent-blue">{t("templates")}</p>
      <h1 className="mt-2 text-3xl font-semibold text-foreground">{t("discover")}</h1>
      <p className="mt-3 text-muted-foreground">
        Prompt templates now live with community works, so you can compare real outputs and starter
        prompts in one place.
      </p>
      <a
        href="/discover?tab=templates"
        className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-accent-blue px-5 text-sm font-medium text-white transition-colors hover:bg-accent-blue-hover"
      >
        {t("discover")} {t("templates")}
        <ArrowRightIcon className="size-4" />
      </a>
    </main>
  );
}
