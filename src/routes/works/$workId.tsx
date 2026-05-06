import { createFileRoute, Link } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { ChevronDownIcon, CopyIcon, CheckIcon } from "lucide-react";
import { useState } from "react";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import * as schema from "@/lib/db/schema";

function getD1Binding(): D1Database | undefined {
  const platformEnv = (globalThis as Record<string, unknown>).__env__ as
    | Record<string, unknown>
    | undefined;
  return platformEnv?.batchlyai_db as D1Database | undefined;
}

export const Route = createFileRoute("/works/$workId")({
  loader: async ({ params }) => {
    const workId = (params as { workId: string }).workId;
    const binding = getD1Binding();
    if (!binding) return null;
    const db = drizzle(binding, { schema, casing: "snake_case" });

    const [row] = await db.select().from(schema.work).where(eq(schema.work.id, workId));
    if (!row) return null;

    // Fetch author name
    const [author] = await db
      .select({ name: schema.user.name })
      .from(schema.user)
      .where(eq(schema.user.id, row.userId));

    // Fetch parent work title if remixed
    let parentWork: { title: string } | null = null;
    if (row.parentWorkId) {
      const [p] = await db
        .select({ title: schema.work.title })
        .from(schema.work)
        .where(eq(schema.work.id, row.parentWorkId));
      if (p) parentWork = p;
    }

    return {
      ...row,
      resultUrls: JSON.parse(row.resultUrls) as string[],
      variableGroups: JSON.parse(row.variableGroups) as Array<{ values: string[] }>,
      authorName: author?.name ?? "Unknown",
      parentWorkTitle: parentWork?.title ?? null,
    };
  },
  head: ({ loaderData }) => {
    const work = loaderData;
    if (!work) {
      return {
        meta: [{ title: "Work — BatchlyAI" }],
      };
    }
    const title = `${work.title} — BatchlyAI`;
    const desc = work.description || `A work by ${work.authorName}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:image", content: work.coverUrl },
        { property: "og:url", content: `https://batchlyai.com/works/${work.id}` },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        { name: "twitter:image", content: work.coverUrl },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CreativeWork",
            name: work.title,
            description: desc,
            image: work.coverUrl,
            author: { "@type": "Person", name: work.authorName },
            datePublished: work.publishedAt
              ? new Date(work.publishedAt * 1000).toISOString()
              : undefined,
          }),
        },
      ],
    };
  },
  component: WorkDetailPage,
});

function WorkDetailPage() {
  const data = Route.useLoaderData();
  const { t } = useLanguage();
  const [promptOpen, setPromptOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!data) {
    return (
      <main className="mx-auto max-w-[980px] px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">{t("notFoundDesc")}</h1>
        <Link to="/" className="mt-4 inline-block text-[#0071e3] hover:underline">
          {t("home")}
        </Link>
      </main>
    );
  }

  const publishDate = data.publishedAt
    ? new Date(data.publishedAt * 1000).toLocaleDateString()
    : "";

  const CATEGORY_LABELS: Record<string, string> = {
    ecommerce: "E-commerce",
    art: "Art",
    "social-media": "Social Media",
    marketing: "Marketing",
    other: "Other",
  };

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(data.promptTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="mx-auto max-w-[980px] px-4 py-8">
      {/* Cover image */}
      <div className="overflow-hidden rounded-2xl bg-card shadow-lg">
        <img
          src={data.coverUrl}
          alt={data.title}
          className="aspect-video w-full object-cover"
        />
      </div>

      {/* Meta */}
      <div className="mt-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-[#0071e3]/10 px-3 py-1 text-xs font-medium text-[#0071e3]">
            {CATEGORY_LABELS[data.category] || data.category}
          </span>
          {publishDate && (
            <span className="text-sm text-muted-foreground">
              {t("publishDate")}: {publishDate}
            </span>
          )}
        </div>

        <h1 className="mt-3 text-2xl font-semibold">{data.title}</h1>

        {data.description && (
          <p className="mt-2 text-muted-foreground">{data.description}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span>{t("unknownAuthor") === "Unknown" ? data.authorName : data.authorName}</span>
          <span>
            {data.remixCount} remixes
          </span>
        </div>

        {/* Remixed from */}
        {data.parentWorkTitle && (
          <div className="mt-2 text-sm text-muted-foreground">
            {t("remixedFrom")}:{" "}
            <Link
              to="/works/$workId"
              params={{ workId: data.parentWorkId! }}
              className="text-[#0071e3] hover:underline"
            >
              {data.parentWorkTitle}
            </Link>
          </div>
        )}
      </div>

      {/* Prompt Template (collapsible) */}
      <div className="mt-6 rounded-xl border bg-muted/30">
        <button
          onClick={() => setPromptOpen(!promptOpen)}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium"
        >
          Prompt Template
          <ChevronDownIcon
            className={`size-4 transition-transform ${promptOpen ? "rotate-180" : ""}`}
          />
        </button>
        {promptOpen && (
          <div className="border-t px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <p className="font-mono text-sm leading-relaxed whitespace-pre-wrap">
                {data.promptTemplate}
              </p>
              <button
                onClick={handleCopyPrompt}
                className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title={t("copyPrompt")}
              >
                {copied ? (
                  <CheckIcon className="size-3.5 text-green-500" />
                ) : (
                  <CopyIcon className="size-3.5" />
                )}
                {copied ? t("promptCopied") : t("copyPrompt")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results grid */}
      <div className="mt-6">
        <h2 className="mb-4 text-lg font-semibold">
          Results ({data.resultUrls.length})
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.resultUrls.map((url, i) => (
            <div key={i} className="overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md">
              <img
                src={url}
                alt={`Result ${i + 1}`}
                className="aspect-square w-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Back */}
      <div className="mt-8">
        <Link
          to="/"
          className="text-sm text-muted-foreground transition-colors hover:text-[#0071e3]"
        >
          &larr; {t("home")}
        </Link>
      </div>
    </main>
  );
}
