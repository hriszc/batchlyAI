import { createFileRoute, Link } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import * as schema from "@/lib/db/schema";
import { createPageMeta } from "@/lib/seo/meta";
import { creativeWorkLd } from "@/lib/seo/structured-data";

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

    const [row] = await db
      .select({
        id: schema.sharedBatch.id,
        promptTemplate: schema.sharedBatch.promptTemplate,
        variableGroups: schema.sharedBatch.variableGroups,
        resultImageUrls: schema.sharedBatch.resultImageUrls,
        model: schema.sharedBatch.model,
        aspectRatio: schema.sharedBatch.aspectRatio,
        createdAt: schema.sharedBatch.createdAt,
        authorName: schema.user.name,
      })
      .from(schema.sharedBatch)
      .leftJoin(schema.user, eq(schema.sharedBatch.userId, schema.user.id))
      .where(eq(schema.sharedBatch.id, workId));

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
  head: ({ loaderData }) => {
    const work = loaderData;
    if (!work) {
      return {
        meta: [
          { title: "Work not found — BatchlyAI" },
          { name: "description", content: "" },
        ],
      };
    }

    const firstImage =
      work.resultImageUrls && work.resultImageUrls.length > 0
        ? work.resultImageUrls[0]
        : "";
    const description = `AI-generated batch by ${work.authorName || "Anonymous"}: ${work.promptTemplate.slice(0, 120)}`;
    const dateStr = new Date(work.createdAt * 1000).toISOString();

    const meta = createPageMeta({
      title: `${work.promptTemplate.slice(0, 60)} — BatchlyAI`,
      description,
      path: `/works/${work.id}`,
      locale: "en",
      ogImage: firstImage || undefined,
      ogType: "article",
      jsonLd: creativeWorkLd({
        title: work.promptTemplate.slice(0, 60),
        description,
        url: `https://batchlyai.com/works/${work.id}`,
        image: firstImage,
        authorName: work.authorName || "Anonymous",
        datePublished: dateStr,
      }),
    });

    return {
      meta: meta.meta,
      links: [{ rel: "canonical", href: `https://batchlyai.com/works/${work.id}` }],
      scripts: meta.scripts,
    };
  },
  component: WorkDetailPage,
});

function WorkDetailPage() {
  const data = Route.useLoaderData();

  if (!data) {
    return (
      <main className="mx-auto max-w-[980px] px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Work not found</h1>
        <p className="mt-2 text-muted-foreground">
          This work may have been removed or the link is invalid.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex h-9 items-center justify-center rounded-full bg-[#0071e3] px-5 text-sm font-medium text-white"
        >
          Go to BatchlyAI
        </Link>
      </main>
    );
  }

  const imageUrls = data.resultImageUrls as string[];

  return (
    <main className="mx-auto max-w-[980px] px-4 py-8">
      <article>
        <header className="mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>by {data.authorName || "Anonymous"}</span>
            <span>·</span>
            <time dateTime={new Date(data.createdAt * 1000).toISOString()}>
              {new Date(data.createdAt * 1000).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
          </div>
          <h1 className="mt-2 text-[28px] leading-tight font-semibold">
            {data.promptTemplate}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            {data.variableGroups.map((group, i) => (
              <span
                key={i}
                className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                {group.name || `Var ${i + 1}`}: {group.values.slice(0, 3).join(", ")}
                {group.values.length > 3 ? ` +${group.values.length - 3}` : ""}
              </span>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent("Check out this AI batch generation!")}&url=${encodeURIComponent(`https://batchlyai.com/works/${data.id}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1 rounded-full bg-muted px-3 text-xs font-medium transition-colors hover:bg-muted/80"
            >
              Share on X
            </a>
            <Link
              to="/"
              search={{ template: "" }}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-[#0071e3] px-5 text-sm font-medium text-white transition-colors hover:bg-[#0077ed]"
            >
              Try in BatchlyAI
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {imageUrls.map((url, i) => (
            <div key={i} className="overflow-hidden rounded-lg border bg-card shadow-sm">
              <div className="aspect-square bg-muted">
                <img src={url} alt={`Result ${i + 1}`} className="h-full w-full object-cover" />
              </div>
            </div>
          ))}
        </div>
      </article>
    </main>
  );
}
