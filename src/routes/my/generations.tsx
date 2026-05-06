import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftIcon, XIcon, ImageIcon, FileTextIcon, VideoIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { authClient } from "@/lib/auth/auth-client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { createPageMeta } from "@/lib/seo/meta";

interface GenerationRow {
  id: string;
  promptTemplate: string;
  resolvedPrompts: string[];
  variableGroups: Array<{ values: string[] }>;
  resultUrls: string[];
  model: string;
  creditsUsed: number;
  createdAt: number;
}

const meta = createPageMeta({
  title: "My Generations — BatchlyAI",
  description: "View your AI generation history",
  path: "/my/generations",
  locale: "en",
  noIndex: true,
});

export const Route = createFileRoute("/my/generations")({
  head: () => ({
    htmlAttrs: { lang: "en" },
    meta: meta.meta,
    links: [{ rel: "canonical", href: "https://batchlyai.com/my/generations" }],
  }),
  component: GenerationsPage,
});

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isImageUrl(url: string): boolean {
  return /\.(png|jpg|jpeg|webp|gif)(\?|$)/i.test(url) || url.includes("replicate.delivery");
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

function ResultIcon({ url }: { url: string }) {
  if (isVideoUrl(url)) return <VideoIcon className="size-4 text-blue-500" />;
  if (isImageUrl(url)) return <ImageIcon className="size-4 text-green-500" />;
  return <FileTextIcon className="size-4 text-muted-foreground" />;
}

function DetailModal({
  generation,
  onClose,
}: {
  generation: GenerationRow;
  onClose: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-background p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">{t("generationDetail")}</h2>
            <p className="mt-1 break-words text-sm text-muted-foreground">
              {generation.promptTemplate}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-muted px-2 py-0.5">{generation.model}</span>
              <span className="rounded-full bg-muted px-2 py-0.5">
                {generation.creditsUsed} {t("credits")}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5">
                {formatDate(generation.createdAt)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-2 flex-shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <XIcon className="size-5" />
          </button>
        </div>

        {generation.resultUrls.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {generation.resultUrls.map((url, i) => (
              <div key={i} className="overflow-hidden rounded-lg border bg-muted/30">
                {isImageUrl(url) ? (
                  <img
                    src={url}
                    alt={`Result ${i + 1}`}
                    className="h-48 w-full object-cover"
                    loading="lazy"
                  />
                ) : isVideoUrl(url) ? (
                  <video
                    src={url}
                    controls
                    className="h-48 w-full object-cover"
                    preload="metadata"
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center p-4">
                    <p className="line-clamp-6 text-xs text-muted-foreground">{url}</p>
                  </div>
                )}
                <div className="flex items-center gap-1.5 px-2 py-1.5">
                  <ResultIcon url={url} />
                  <span className="text-xs text-muted-foreground">#{i + 1}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {t("processing")}
          </div>
        )}
      </div>
    </div>
  );
}

function GenerationsPage() {
  const { t } = useLanguage();
  const { data: session } = authClient.useSession();
  const [generations, setGenerations] = useState<GenerationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [selectedGen, setSelectedGen] = useState<GenerationRow | null>(null);
  const limit = 20;

  useEffect(() => {
    if (!session?.user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const offset = page * limit;
    fetch(`/api/generations?limit=${limit}&offset=${offset}`)
      .then((r) => r.json())
      .then((data: { generations?: GenerationRow[]; total?: number; error?: string }) => {
        if (data.generations) {
          setGenerations(data.generations);
          setTotal(data.total ?? 0);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session?.user, page]);

  const isModelText = (model: string) => model.startsWith("z-text");

  const firstResultThumbnail = (gen: GenerationRow): string | null => {
    if (gen.resultUrls.length === 0) return null;
    return gen.resultUrls[0];
  };

  return (
    <div className="mx-auto max-w-[980px] px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          to="/"
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-muted/80 px-3 text-xs font-medium text-muted-foreground backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3" />
          {t("home")}
        </Link>
        <h1 className="text-xl font-bold">{t("myGenerations")}</h1>
      </div>

      {!session?.user ? (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">
            <Link to="/login" className="text-[#0071e3] underline">
              {t("loginNav")}
            </Link>{" "}
            to view your generations.
          </p>
        </div>
      ) : loading ? (
        <div className="py-16 text-center text-muted-foreground">{t("processing")}</div>
      ) : generations.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">{t("noGenerations")}</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {generations.map((gen) => {
              const thumbnail = firstResultThumbnail(gen);
              return (
                <button
                  key={gen.id}
                  type="button"
                  onClick={() => setSelectedGen(gen)}
                  className="group flex flex-col overflow-hidden rounded-xl border bg-card text-left shadow-sm transition-shadow hover:shadow-md"
                >
                  {/* Thumbnail area */}
                  <div className="flex h-40 items-center justify-center bg-muted/30">
                    {thumbnail && isImageUrl(thumbnail) ? (
                      <img
                        src={thumbnail}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : thumbnail && isVideoUrl(thumbnail) ? (
                      <VideoIcon className="size-10 text-muted-foreground/40" />
                    ) : thumbnail ? (
                      <div className="line-clamp-4 p-4 text-xs text-muted-foreground">
                        {thumbnail}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
                        {isModelText(gen.model) ? (
                          <FileTextIcon className="size-8" />
                        ) : (
                          <ImageIcon className="size-8" />
                        )}
                        <span className="text-xs">{t("processing")}</span>
                      </div>
                    )}
                  </div>

                  {/* Card info */}
                  <div className="flex flex-1 flex-col gap-1.5 p-3">
                    <p className="line-clamp-2 text-sm font-medium leading-snug">
                      {gen.promptTemplate}
                    </p>
                    <div className="mt-auto flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="rounded-full bg-muted px-2 py-0.5 font-medium">
                        {gen.model}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5">
                        {gen.creditsUsed} {t("credits")}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5">
                        {formatDate(gen.createdAt)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="inline-flex h-8 items-center rounded-full bg-muted/80 px-3 text-xs font-medium text-muted-foreground backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs text-muted-foreground">
                {page * limit + 1}-{Math.min((page + 1) * limit, total)} of {total}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * limit >= total}
                className="inline-flex h-8 items-center rounded-full bg-muted/80 px-3 text-xs font-medium text-muted-foreground backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Detail modal */}
      {selectedGen && (
        <DetailModal generation={selectedGen} onClose={() => setSelectedGen(null)} />
      )}
    </div>
  );
}
