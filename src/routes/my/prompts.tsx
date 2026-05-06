import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeftIcon, SearchIcon, Trash2Icon, PencilIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth/auth-client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { createPageMeta } from "@/lib/seo/meta";

interface PromptRecord {
  id: string;
  name: string;
  promptTemplate: string;
  variableGroups: string | null;
  model: string | null;
  tags: string | null;
  usageCount: number;
}

const meta = createPageMeta({
  title: "My Prompts — BatchlyAI",
  description: "Manage your saved AI prompt templates",
  path: "/my/prompts",
  locale: "en",
  noIndex: true,
});

// @ts-expect-error route tree auto-generated at build time
export const Route = createFileRoute("/my/prompts")({
  head: () => ({
    htmlAttrs: { lang: "en" },
    meta: meta.meta,
    links: [{ rel: "canonical", href: "https://batchlyai.com/my/prompts" }],
  }),
  component: PromptsPage,
});

function PromptsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const [prompts, setPrompts] = useState<PromptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<PromptRecord | null>(null);
  const [editName, setEditName] = useState("");
  const [editTags, setEditTags] = useState("");

  const fetchPrompts = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    fetch(`/api/prompts?${params}`)
      .then((r) => r.json() as Promise<{ prompts: PromptRecord[] }>)
      .then((d) => setPrompts(d.prompts || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    if (!session?.user) {
      setLoading(false);
      return;
    }
    fetchPrompts();
  }, [session?.user, fetchPrompts]);

  const handleDelete = async (id: string) => {
    await fetch("/api/prompts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    toast.success(t("savedSuccessfully"));
    fetchPrompts();
  };

  const handleLoad = (prompt: PromptRecord) => {
    const params = new URLSearchParams();
    if (prompt.model) params.set("model", prompt.model);
    navigate({ to: `/?${params.toString()}`, state: { loadPrompt: prompt } });
  };

  return (
    <main className="mx-auto max-w-[980px] px-4 py-8">
      <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" /> Back to Generator
      </Link>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">{t("myPrompts")}</h1>

      <div className="mb-6 flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-muted/30 py-2 pl-9 pr-3 text-sm focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : prompts.length === 0 ? (
        <p className="text-muted-foreground">No saved prompts. Use the Save button in the generator.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {prompts.map((p) => (
            <div key={p.id} className="rounded-xl border bg-card p-4 shadow-sm">
              {editing?.id === p.id ? (
                <div className="space-y-2">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded border px-2 py-1 text-sm"
                    placeholder={t("promptName")}
                  />
                  <input
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    className="w-full rounded border px-2 py-1 text-sm"
                    placeholder="tags: ecommerce, art"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditing(null);
                        fetchPrompts();
                      }}
                      className="rounded bg-[#0071e3] px-3 py-1 text-xs text-white"
                    >
                      Save
                    </button>
                    <button onClick={() => setEditing(null)} className="rounded bg-muted px-3 py-1 text-xs">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-foreground">{p.name}</h3>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditing(p);
                          setEditName(p.name);
                          setEditTags((() => { try { return (JSON.parse(p.tags || "[]") as string[]).join(", "); } catch { return ""; } })());
                        }}
                        className="rounded p-1 text-muted-foreground hover:text-foreground"
                      >
                        <PencilIcon className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="rounded p-1 text-muted-foreground hover:text-red-500"
                      >
                        <Trash2Icon className="size-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {p.promptTemplate}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {p.model && (
                      <span className="rounded bg-muted/50 px-1.5 py-0.5 text-[10px]">{p.model}</span>
                    )}
                    {(() => {
                      try { return (JSON.parse(p.tags || "[]") as string[]).map((tag: string) => (
                        <span key={tag} className="rounded bg-[#0071e3]/10 px-1.5 py-0.5 text-[10px] text-[#0071e3]">{tag}</span>
                      )); } catch { return null; }
                    })()}
                  </div>
                  <button
                    onClick={() => handleLoad(p)}
                    className="mt-3 w-full rounded-lg bg-[#0071e3] py-2 text-xs font-medium text-white hover:bg-[#0077ed]"
                  >
                    {t("loadPrompt")}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
