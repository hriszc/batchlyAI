import { createFileRoute, Link } from "@tanstack/react-router";
import { SearchIcon } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/templates/")({
  head: () => ({
    meta: [
      { title: "Prompt Templates — BatchlyAI" },
      {
        name: "description",
        content:
          "Browse and use community prompt templates for AI image and video generation",
      },
    ],
  }),
  component: TemplatesPage,
});

const CATEGORIES = [
  { id: "", label: "All" },
  { id: "general", label: "General" },
  { id: "product", label: "Product Photos" },
  { id: "art", label: "Art & Design" },
  { id: "marketing", label: "Marketing" },
  { id: "photography", label: "Photography" },
];

function TemplatesPage() {
  const [templates, setTemplates] = useState<Array<{
    slug: string;
    name: string;
    description: string;
    category: string;
    previewImageUrl: string | null;
    usageCount: number;
  }> | null>(null);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");

  const fetchTemplates = async (cat: string, q: string) => {
    const params = new URLSearchParams();
    if (cat) params.set("category", cat);
    if (q) params.set("search", q);
    const resp = await fetch(`/api/templates?${params.toString()}`);
    const data = await resp.json();
    if (!data.error) setTemplates(data.templates);
  };

  // Fetch on mount
  useState(() => { fetchTemplates("", ""); });

  return (
    <main className="mx-auto max-w-[980px] px-4 py-8">
      <h1 className="text-2xl font-semibold">Prompt Templates</h1>
      <p className="mt-1 text-muted-foreground">
        Browse community templates or create your own
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setCategory(c.id);
              fetchTemplates(c.id, search);
            }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              category === c.id
                ? "bg-[#0071e3] text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") fetchTemplates(category, search);
            }}
            className="w-full rounded-lg border bg-background py-2 pl-9 pr-4 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates?.map((t) => (
          <Link
            key={t.slug}
            to="/templates/$slug"
            params={{ slug: t.slug }}
            className="group overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="aspect-[16/10] bg-muted">
              {t.previewImageUrl ? (
                <img
                  src={t.previewImageUrl}
                  alt={t.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground/30">
                  No preview
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-medium group-hover:text-[#0071e3]">{t.name}</h3>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {t.description}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                  {t.category}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {t.usageCount} uses
                </span>
              </div>
            </div>
          </Link>
        )) ?? (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            Loading templates...
          </div>
        )}
      </div>
    </main>
  );
}
