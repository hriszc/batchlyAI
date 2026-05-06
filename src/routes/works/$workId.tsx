import { createFileRoute, Link } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { ArrowLeftIcon, HeartIcon, Repeat2Icon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth/auth-client";
import { getDb } from "@/lib/db";
import { work } from "@/lib/db/schema/data-flywheel.schema";
import { user } from "@/lib/db/schema/auth.schema";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { createPageMeta } from "@/lib/seo/meta";
import { creativeWorkLd } from "@/lib/seo/structured-data";

function getD1Binding(): D1Database | undefined {
  const platformEnv = (globalThis as Record<string, unknown>).__env__ as Record<string, unknown> | undefined;
  return platformEnv?.batchlyai_db as D1Database | undefined;
}

// @ts-expect-error route tree auto-generated at build time
export const Route = createFileRoute("/works/$workId")({
  loader: async ({ params }) => {
    const binding = getD1Binding();
    if (!binding) return null;
    const db = getDb(binding);
    const [row] = await db
      .select({ w: work, author: { name: user.name } })
      .from(work)
      .leftJoin(user, eq(work.userId, user.id))
      .where(eq(work.id, params.workId));
    if (!row) return null;
    return {
      ...row.w,
      authorName: row.author?.name || "Unknown",
      variableGroups: JSON.parse(row.w.variableGroups),
      resultUrls: JSON.parse(row.w.resultUrls),
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const seo = createPageMeta({
      title: `${loaderData.title} — BatchlyAI`,
      description: loaderData.description || loaderData.title,
      path: `/works/${loaderData.id}`,
      locale: "en",
      ogImage: loaderData.coverUrl,
      ogType: "article",
      jsonLd: creativeWorkLd({
        title: loaderData.title,
        description: loaderData.description || "",
        url: `https://batchlyai.com/works/${loaderData.id}`,
        image: loaderData.coverUrl,
        authorName: loaderData.authorName,
        datePublished: new Date((loaderData.publishedAt || 0) * 1000).toISOString(),
      }),
    });
    return {
      htmlAttrs: { lang: "en" },
      meta: seo.meta,
      links: [{ rel: "canonical", href: `https://batchlyai.com/works/${loaderData.id}` }],
      scripts: seo.scripts,
    };
  },
  component: WorkDetailPage,
});

function WorkDetailPage() {
  const { t } = useLanguage();
  const data = Route.useLoaderData();
  const { data: session } = authClient.useSession();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(data?.likeCount || 0);
  const navigate = Route.useNavigate();

  if (!data) {
    return (
      <main className="mx-auto max-w-[980px] px-4 py-16 text-center">
        <p className="text-muted-foreground">Work not found</p>
        <a href="/discover" className="mt-2 inline-block text-[#0071e3]">Discover more</Link>
      </main>
    );
  }

  const handleLike = async () => {
    if (!session?.user) return;
    const resp = await fetch("/api/works/like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workId: data.id }),
    });
    const r = (await resp.json()) as { liked: boolean; likeCount: number };
    setLiked(r.liked);
    setLikeCount(r.likeCount);
  };

  const handleRemix = () => {
    navigate({ to: `/?remix=${data.id}` });
  };

  const resultUrls = (data.resultUrls as string[]) || [];

  return (
    <main className="mx-auto max-w-[980px] px-4 py-8">
      <a href="/discover" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" /> {t("discover")}
      </Link>

      <img src={data.coverUrl} alt={data.title} className="mb-6 w-full rounded-2xl object-cover max-h-96" />

      <h1 className="text-2xl font-bold text-foreground">{data.title}</h1>
      <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
        <span>{data.authorName}</span>
        {data.category && <span className="rounded bg-muted/50 px-1.5 py-0.5 text-xs">{data.category}</span>}
        {data.publishedAt && <span>{new Date(data.publishedAt * 1000).toLocaleDateString()}</span>}
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button onClick={handleLike} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm ${liked ? "bg-red-50 text-red-500" : "bg-muted/30 text-muted-foreground hover:text-red-500"}`}>
          <HeartIcon className={`size-4 ${liked ? "fill-red-500" : ""}`} /> {t("like")} {likeCount}
        </button>
        <button onClick={handleRemix} className="inline-flex items-center gap-1.5 rounded-lg bg-muted/30 px-3 py-2 text-sm text-muted-foreground hover:text-[#0071e3]">
          <Repeat2Icon className="size-4" /> {t("remix")} {data.remixCount}
        </button>
        <button onClick={() => { navigator.clipboard.writeText(data.promptTemplate); toast.success("Copied!"); }} className="inline-flex items-center gap-1.5 rounded-lg bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          <CopyIcon className="size-4" /> Copy prompt
        </button>
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-muted-foreground">View prompt template</summary>
        <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-muted/20 p-3 text-xs">{data.promptTemplate}</pre>
      </details>

      <h2 className="mb-4 mt-8 text-lg font-semibold">Results</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {resultUrls.map((url, i) => (
          <img key={i} src={url} alt={`Result ${i + 1}`} className="rounded-lg object-cover aspect-square" />
        ))}
      </div>
    </main>
  );
}
