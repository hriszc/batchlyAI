import { createFileRoute } from "@tanstack/react-router";
import { ArrowRightIcon } from "lucide-react";

import { useLanguage } from "@/lib/i18n/LanguageContext";

export const Route = createFileRoute("/templates/")({
  head: () => ({
    meta: [
      { title: "Templates in Discover — BatchlyAI" },
      {
        name: "description",
        content: "Browse prompt templates alongside community works in BatchlyAI Discover",
      },
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
