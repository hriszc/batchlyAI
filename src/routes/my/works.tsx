import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { ArrowLeftIcon } from "lucide-react";

import { useLanguage } from "@/lib/i18n/LanguageContext";

const loadMyWorks = createServerFn({ method: "GET" }).handler(async () => {
  // All server-only imports are inside the handler, so they
  // are only bundled into the server build.
  const { getRequest } = await import("@tanstack/react-start/server");
  const { createAuth } = await import("@/lib/auth/auth");
  const { getDb } = await import("@/lib/db");
  const { desc, eq } = await import("drizzle-orm");
  const schema = await import("@/lib/db/schema");

  const auth = createAuth();
  if (!auth) return { works: [], authorized: false };

  const req = getRequest();
  if (!req) return { works: [], authorized: false };

  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.id) {
    return { works: [], authorized: false };
  }

  const platformEnv = (globalThis as Record<string, unknown>).__env__ as
    | Record<string, unknown>
    | undefined;
  const binding = platformEnv?.batchlyai_db as D1Database | undefined;
  if (!binding) return { works: [], authorized: false };

  const db = getDb(binding);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await (db as any)
    .select()
    .from(schema.work)
    .where(eq(schema.work.userId, session.user.id))
    .orderBy(desc(schema.work.createdAt));

  const works = rows.map((r: Record<string, unknown>) => ({
    ...r,
    variableGroups: JSON.parse(r.variableGroups as string),
    resultUrls: JSON.parse(r.resultUrls as string),
  }));

  return { works, authorized: true };
});

export const Route = createFileRoute("/my/works")({
  loader: async () => {
    return loadMyWorks();
  },
  head: () => ({
    meta: [
      { title: "My Works — BatchlyAI" },
      { name: "description", content: "View your published and draft works" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyWorksPage,
});

function MyWorksPage() {
  const data = Route.useLoaderData();
  const { t } = useLanguage();
  const navigate = useNavigate();

  if (!data.authorized) {
    return (
      <main className="mx-auto max-w-[980px] px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">{t("loginTitle")}</h1>
        <p className="mt-2 text-muted-foreground">
          Please log in to view your works.
        </p>
        <Link
          to="/login"
          className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-[#0071e3] px-6 text-sm font-medium text-white transition-colors hover:bg-[#0077ed]"
        >
          {t("loginNav")}
        </Link>
      </main>
    );
  }

  const publishedWorks = data.works.filter((w: Record<string, unknown>) => w.isPublished);
  const draftWorks = data.works.filter((w: Record<string, unknown>) => !w.isPublished);

  return (
    <main className="mx-auto max-w-[980px] px-4 py-8">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate({ to: "/" })}
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-[#0071e3]"
        >
          <ArrowLeftIcon className="size-4" />
          {t("home")}
        </button>
        <h1 className="text-2xl font-semibold">{t("myWorks")}</h1>
      </div>

      {data.works.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-lg text-muted-foreground">{t("noWorks")}</p>
          <Link
            to="/"
            className="mt-4 inline-block text-[#0071e3] hover:underline"
          >
            {t("home")}
          </Link>
        </div>
      )}

      {/* Published works */}
      {publishedWorks.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-medium">
            {t("published")} ({publishedWorks.length})
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {publishedWorks.map((work: Record<string, unknown>) => (
              <WorkCard
                key={work.id as string}
                id={work.id as string}
                title={work.title as string}
                coverUrl={work.coverUrl as string}
                category={work.category as string}
                isPublished={work.isPublished as boolean}
                likeCount={work.likeCount as number}
                createdAt={work.createdAt as number}
              />
            ))}
          </div>
        </section>
      )}

      {/* Draft works */}
      {draftWorks.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-medium">
            {t("drafts")} ({draftWorks.length})
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {draftWorks.map((work: Record<string, unknown>) => (
              <WorkCard
                key={work.id as string}
                id={work.id as string}
                title={work.title as string}
                coverUrl={work.coverUrl as string}
                category={work.category as string}
                isPublished={work.isPublished as boolean}
                likeCount={work.likeCount as number}
                createdAt={work.createdAt as number}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

interface WorkCardProps {
  id: string;
  title: string;
  coverUrl: string;
  category: string;
  isPublished: boolean;
  likeCount: number;
  createdAt: number;
}

function WorkCard({ id, title, coverUrl, category, isPublished, likeCount, createdAt }: WorkCardProps) {
  const date = new Date(createdAt * 1000).toLocaleDateString();

  return (
    <Link
      to="/works/$workId"
      params={{ workId: id }}
      className="group overflow-hidden rounded-xl border bg-card transition-all hover:shadow-lg"
    >
      <div className="aspect-video overflow-hidden">
        <img
          src={coverUrl}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium line-clamp-1">{title}</h3>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
              isPublished
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {isPublished ? "Published" : "Draft"}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{date}</span>
          <span>{likeCount} likes</span>
        </div>
      </div>
    </Link>
  );
}
