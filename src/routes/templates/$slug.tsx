import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { ArrowRightIcon } from "lucide-react";

import { getD1Binding } from "@/lib/cloudflare/bindings";
import * as schema from "@/lib/db/schema";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { seoLandingPages } from "@/lib/seo/landing-pages";
import { mediaLabel, mediaTypeFromModel } from "@/lib/seo/media";
import { createPageMeta } from "@/lib/seo/meta";
import { templateHowToLd } from "@/lib/seo/structured-data";

interface TemplateLoaderData {
  id: string;
  userId: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  promptTemplate: string;
  variableGroups: Array<{
    name?: string;
    values: string[];
  }>;
  model: string;
  aspectRatio: string;
  previewImageUrl: string | null;
  isPublic: boolean;
  usageCount: number;
  createdAt: number;
}

export const Route = createFileRoute("/templates/$slug")({
  loader: async ({ params }) => {
    const slug = (params as { slug: string }).slug;
    const binding = getD1Binding();
    if (!binding) return null;
    const db = drizzle(binding, { schema, casing: "snake_case" });
    const [row] = await db.select().from(schema.template).where(eq(schema.template.slug, slug));
    if (!row) return null;
    return {
      ...row,
      variableGroups: JSON.parse(row.variableGroups) as Array<{
        name?: string;
        values: string[];
      }>,
    };
  },
  head: ({ loaderData }) => {
    const mediaType = mediaTypeFromModel(loaderData?.model);
    const label = mediaLabel(mediaType);
    const seo = createPageMeta({
      title: loaderData
        ? `${loaderData.name} — AI ${label} prompt template`
        : "AI prompt template — BatchlyAI",
      description:
        loaderData?.description ||
        "Reusable AI image and video prompt template for batch generation",
      path: loaderData ? `/templates/${loaderData.slug}` : "/templates",
      locale: "en",
      ogImage: loaderData?.previewImageUrl || undefined,
      ogType: "article",
      noIndex: !loaderData,
      jsonLd: loaderData
        ? templateHowToLd({
            name: loaderData.name,
            description: loaderData.description,
            promptTemplate: loaderData.promptTemplate,
            mediaType,
          })
        : undefined,
    });

    return {
      ...seo,
      links: loaderData
        ? [{ rel: "canonical", href: `https://batchlyai.com/templates/${loaderData.slug}` }]
        : [{ rel: "canonical", href: "https://batchlyai.com/discover" }],
    };
  },
  component: TemplateDetailPage,
});

function TemplateDetailPage() {
  const data = Route.useLoaderData() as TemplateLoaderData | null;
  const navigate = useNavigate();
  const { t } = useLanguage();

  if (!data) {
    return (
      <main className="mx-auto max-w-[980px] px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">{t("templateNotFound")}</h1>
        <a
          href="/discover?tab=templates"
          className="mt-4 inline-block text-accent-blue hover:underline"
        >
          {t("browseTemplatesDiscover")}
        </a>
      </main>
    );
  }

  const handleUseTemplate = () => {
    void navigate({
      to: "/",
      search: { template: data.slug } as Record<string, string>,
    });
  };
  const mediaType = mediaTypeFromModel(data.model);
  const label = mediaLabel(mediaType);
  const relatedTools = seoLandingPages
    .filter((page) => page.mediaType === "both" || page.mediaType === mediaType)
    .slice(0, 3);

  return (
    <main className="mx-auto max-w-[980px] px-4 py-8">
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1">
          <span className="text-xs font-medium text-accent-blue">
            {t("aiTemplateBadge", { label, category: data.category })}
          </span>
          <h1 className="mt-1 text-2xl font-semibold">{data.name}</h1>
          <p className="mt-2 text-muted-foreground">{data.description}</p>

          <div className="mt-6 rounded-lg border bg-muted/30 p-4">
            <p className="font-mono text-sm">{data.promptTemplate}</p>
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-medium">{t("variableValues")}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {data.variableGroups.map((group, i) => (
                <div key={i} className="rounded-lg border bg-card px-3 py-2">
                  <span className="text-[10px] text-muted-foreground">
                    {group.name || t("varShort", { index: i + 1 })}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {group.values.map((v, j) => (
                      <span
                        key={j}
                        className="rounded-full bg-accent-blue/10 px-2 py-0.5 text-xs font-medium text-accent-blue"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleUseTemplate}
            className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-accent-blue px-6 text-sm font-medium text-white transition-colors hover:bg-accent-blue-hover"
          >
            {t("useInGenerator")}
            <ArrowRightIcon className="size-4" />
          </button>

          <div className="mt-8 border-t pt-6">
            <h3 className="text-sm font-medium">{t("relatedAiTools")}</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {relatedTools.map((tool) => (
                <a
                  key={tool.slug}
                  href={`/tools/${tool.slug}`}
                  className="rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                >
                  {tool.h1}
                </a>
              ))}
            </div>
          </div>
        </div>

        {data.previewImageUrl && (
          <div className="lg:w-80">
            <div className="overflow-hidden rounded-lg border bg-card">
              <img
                src={data.previewImageUrl}
                alt={`AI ${label} prompt template preview for ${data.name}`}
                className="w-full object-cover"
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
