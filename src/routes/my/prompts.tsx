import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  SearchIcon,
  Trash2Icon,
  LoaderIcon,
  TagIcon,
  ArrowLeftIcon,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth/auth-client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { createPageMeta } from "@/lib/seo/meta";

interface SavedPrompt {
  id: string;
  name: string;
  promptTemplate: string;
  variableGroups: unknown;
  model: string;
  tags: string[];
  usageCount: number;
  createdAt: number;
}

const meta = createPageMeta({
  title: "My Prompts — BatchlyAI",
  description: "View and manage your saved prompts",
  path: "/my/prompts",
  locale: "en",
  noIndex: true,
});

export const Route = createFileRoute("/my/prompts")({
  head: () => ({
    meta: meta.meta,
    scripts: meta.scripts,
  }),
  component: MyPromptsPage,
});

function MyPromptsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();

  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editTags, setEditTags] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedTag) params.set("tag", selectedTag);
      const resp = await fetch(`/api/prompts?${params.toString()}`);
      if (resp.status === 401) {
        setPrompts([]);
        return;
      }
      const data = (await resp.json()) as { prompts?: SavedPrompt[] };
      setPrompts(data.prompts || []);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, [search, selectedTag]);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  const handleDelete = async (id: string) => {
    try {
      const resp = await fetch("/api/prompts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (resp.ok) {
        toast.success(t("deletePrompt"));
        fetchPrompts();
      }
    } catch {
      // Ignore
    }
    setDeleteConfirm(null);
  };

  const handleLoad = (prompt: SavedPrompt) => {
    navigate({ to: `/?loadPrompt=${prompt.id}` as "/" });
  };

  const handleStartEdit = (prompt: SavedPrompt) => {
    setEditingId(prompt.id);
    setEditName(prompt.name);
    setEditTags(prompt.tags.join(", "));
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const prompt = prompts.find((p) => p.id === editingId);
    if (!prompt) return;

    try {
      const resp = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          promptTemplate: prompt.promptTemplate,
          variableGroups: prompt.variableGroups,
          model: prompt.model,
          tags: editTags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      if (resp.ok) {
        await fetch("/api/prompts", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId }),
        });
        setEditingId(null);
        toast.success(t("savedSuccessfully"));
        fetchPrompts();
      }
    } catch {
      // Ignore
    }
  };

  const allTags = [...new Set(prompts.flatMap((p) => p.tags))].sort();

  if (!session?.user) {
    return (
      <main className="mx-auto max-w-[980px] px-4 pt-8 pb-16">
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-muted-foreground">Please log in to view your prompts.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[980px] px-4 pt-8 pb-16">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate({ to: "/" })}
          className="flex h-9 w-9 items-center justify-center rounded-lg border bg-muted/30 transition-colors hover:bg-muted"
          aria-label={t("goBack")}
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </button>
        <h1 className="text-2xl font-semibold">{t("myPrompts")}</h1>
      </div>

      {/* Search & Filter */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
          <SearchIcon className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prompts..."
            className="flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
          />
        </div>
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedTag("")}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                !selectedTag
                  ? "bg-[#0071e3] text-white"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag === selectedTag ? "" : tag)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  tag === selectedTag
                    ? "bg-[#0071e3] text-white"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Prompts Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <LoaderIcon className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : prompts.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <p>
            {search || selectedTag
              ? "No prompts match your filters."
              : "No saved prompts yet."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {prompts.map((prompt) => (
            <div
              key={prompt.id}
              className={`rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md ${
                editingId === prompt.id ? "ring-2 ring-[#0071e3]" : ""
              }`}
            >
              {editingId === prompt.id ? (
                /* Edit mode */
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-lg border bg-muted/30 px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[#0071e3]"
                    placeholder={t("promptName")}
                  />
                  <input
                    type="text"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    className="w-full rounded-lg border bg-muted/30 px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-[#0071e3]"
                    placeholder="Tags (comma separated)"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="flex-1 rounded-lg bg-[#0071e3] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#0077ed]"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-lg border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <>
                  {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
                  <div className="cursor-pointer" onClick={() => handleStartEdit(prompt)}>
                    <h3 className="mb-1 truncate font-medium">{prompt.name}</h3>
                    <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">
                      {prompt.promptTemplate.length > 100
                        ? prompt.promptTemplate.slice(0, 100) + "..."
                        : prompt.promptTemplate}
                    </p>
                  </div>

                  <div className="mb-3 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-[#0071e3]/10 px-2 py-0.5 text-[10px] font-medium text-[#0071e3]">
                      {prompt.model}
                    </span>
                    {prompt.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-0.5 rounded-full bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground"
                      >
                        <TagIcon className="h-2.5 w-2.5" />
                        {tag}
                      </span>
                    ))}
                    {prompt.usageCount > 0 && (
                      <span className="text-[10px] text-muted-foreground/60">
                        Used {prompt.usageCount}x
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLoad(prompt);
                      }}
                      className="flex-1 rounded-lg bg-[#0071e3] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#0077ed]"
                    >
                      {t("loadPrompt")}
                    </button>
                    {deleteConfirm === prompt.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(prompt.id);
                          }}
                          className="rounded-lg bg-red-500 px-2 py-1.5 text-xs text-white transition-colors hover:bg-red-600"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm(null);
                          }}
                          className="rounded-lg border px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(prompt.id);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500"
                        title={t("deletePrompt")}
                      >
                        <Trash2Icon className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
