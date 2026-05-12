import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { getD1Binding } from "@/lib/cloudflare/bindings";
import * as schema from "@/lib/db/schema";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export const Route = createFileRoute("/g/$shareId")({
  loader: async ({ params }) => {
    const shareId = (params as { shareId: string }).shareId;
    const binding = getD1Binding();
    if (!binding) return null;
    const db = drizzle(binding, { schema, casing: "snake_case" });
    const [row] = await db
      .select()
      .from(schema.sharedBatch)
      .where(eq(schema.sharedBatch.id, shareId));
    if (!row) return null;
    return {
      ...row,
      variableGroups: JSON.parse(row.variableGroups) as Array<{
        name?: string;
        values: string[];
      }>,
      resultImageUrls: JSON.parse(row.resultImageUrls) as string[],
    };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: "Shared Batch — BatchlyAI" },
      {
        name: "description",
        content: loaderData
          ? `AI-generated batch: ${loaderData.promptTemplate.slice(0, 120)}`
          : "BatchlyAI shared batch",
      },
      { property: "og:title", content: "Shared Batch — BatchlyAI" },
      {
        property: "og:image",
        content: loaderData?.resultImageUrls?.[0] || "",
      },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SharedBatchPage,
});

function SharedBatchPage() {
  const data = Route.useLoaderData();
  const { t } = useLanguage();

  if (!data) {
    return (
      <main className="mx-auto max-w-[980px] px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">{t("batchNotFound")}</h1>
        <p className="mt-2 text-muted-foreground">{t("batchNotFoundDesc")}</p>
        <a
          href="/"
          className="mt-6 inline-flex h-9 items-center justify-center rounded-full bg-accent-blue px-5 text-sm font-medium text-white"
        >
          {t("tryBatchlyAI")}
        </a>
      </main>
    );
  }

  const imageUrls = data.resultImageUrls as string[];

  return (
    <main className="mx-auto max-w-[980px] px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{t("sharedBatch")}</h1>
          <p className="mt-1 font-mono text-sm text-muted-foreground">{data.promptTemplate}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {data.variableGroups.map((group, i) => (
              <span
                key={i}
                className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                {group.name || t("varShort", { index: i + 1 })}:{" "}
                {group.values.slice(0, 3).join(", ")}
                {group.values.length > 3 ? ` +${group.values.length - 3}` : ""}
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(t("tweetText"))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center gap-1 rounded-full bg-muted px-3 text-xs font-medium transition-colors hover:bg-muted/80"
          >
            {t("shareOnX")}
          </a>
          <a
            href="/"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-accent-blue px-5 text-sm font-medium text-white transition-colors hover:bg-accent-blue-hover"
          >
            {t("tryInBatchlyAI")}
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {imageUrls.map((url, i) => (
          <div key={i} className="overflow-hidden rounded-lg border bg-card shadow-sm">
            <div className="aspect-square bg-muted">
              <img
                src={url}
                alt={t("resultAlt", { index: i + 1 })}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
