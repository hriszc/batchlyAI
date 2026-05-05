import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { ArrowRightIcon } from "lucide-react";

import * as schema from "@/lib/db/schema";

function getD1Binding(): D1Database | undefined {
  const platformEnv = (globalThis as Record<string, unknown>).__env__ as
    | Record<string, unknown>
    | undefined;
  return platformEnv?.batchlyai_db as D1Database | undefined;
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
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.name} — BatchlyAI Templates` : "Template — BatchlyAI" },
      {
        name: "description",
        content: loaderData?.description || "AI prompt template",
      },
      { property: "og:title", content: loaderData?.name || "Template" },
      { property: "og:description", content: loaderData?.description || "" },
      { property: "og:image", content: loaderData?.previewImageUrl || "" },
    ],
    scripts: loaderData
      ? [
          {
            type: "application/ld+json",
            children: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "HowTo",
              name: loaderData.name,
              description: loaderData.description,
              step: [
                { "@type": "HowToStep", text: "Open the template in BatchlyAI" },
                {
                  "@type": "HowToStep",
                  text: `Generate images using the prompt: ${loaderData.promptTemplate}`,
                },
              ],
            }),
          },
        ]
      : [],
  }),
  component: TemplateDetailPage,
});

function TemplateDetailPage() {
  const data = Route.useLoaderData();
  const navigate = useNavigate();

  if (!data) {
    return (
      <main className="mx-auto max-w-[980px] px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Template not found</h1>
        <a href="/templates" className="mt-4 inline-block text-[#0071e3] hover:underline">
          Browse all templates
        </a>
      </main>
    );
  }

  const handleUseTemplate = () => {
    navigate({
      to: "/",
      search: { template: data.slug } as Record<string, string>,
    });
  };

  return (
    <main className="mx-auto max-w-[980px] px-4 py-8">
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1">
          <span className="text-xs font-medium text-[#0071e3]">{data.category}</span>
          <h1 className="mt-1 text-2xl font-semibold">{data.name}</h1>
          <p className="mt-2 text-muted-foreground">{data.description}</p>

          <div className="mt-6 rounded-lg border bg-muted/30 p-4">
            <p className="font-mono text-sm">{data.promptTemplate}</p>
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-medium">Variable Values</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {data.variableGroups.map((group, i) => (
                <div key={i} className="rounded-lg border bg-card px-3 py-2">
                  <span className="text-[10px] text-muted-foreground">
                    {group.name || `Var ${i + 1}`}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {group.values.map((v, j) => (
                      <span
                        key={j}
                        className="rounded-full bg-[#0071e3]/10 px-2 py-0.5 text-xs font-medium text-[#0071e3]"
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
            className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#0071e3] px-6 text-sm font-medium text-white transition-colors hover:bg-[#0077ed]"
          >
            Use this template
            <ArrowRightIcon className="size-4" />
          </button>
        </div>

        {data.previewImageUrl && (
          <div className="lg:w-80">
            <div className="overflow-hidden rounded-lg border bg-card">
              <img src={data.previewImageUrl} alt={data.name} className="w-full object-cover" />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
