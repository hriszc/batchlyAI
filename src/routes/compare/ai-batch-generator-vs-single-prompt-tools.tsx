import { createFileRoute, Link } from "@tanstack/react-router";

import { FaqSection } from "@/components/seo/FaqSection";
import { comparisonFaq } from "@/lib/seo/geo-content";
import { createPageMeta } from "@/lib/seo/meta";
import { faqPageLd, webPageLd } from "@/lib/seo/structured-data";

const title = "Batch AI Generator vs Single-Prompt Tools — BatchlyAI";
const description =
  "Compare BatchlyAI with normal one-prompt AI image and video generators, including when batch prompt variables create a better workflow.";

export const Route = createFileRoute("/compare/ai-batch-generator-vs-single-prompt-tools")({
  head: () => {
    const seo = createPageMeta({
      title,
      description,
      path: "/compare/ai-batch-generator-vs-single-prompt-tools",
      locale: "en",
      jsonLd: [
        webPageLd({
          title,
          description,
          url: "https://batchlyai.com/compare/ai-batch-generator-vs-single-prompt-tools",
        }),
        faqPageLd(comparisonFaq),
      ],
    });

    return {
      htmlAttrs: { lang: "en" },
      meta: seo.meta,
      links: [
        {
          rel: "canonical",
          href: "https://batchlyai.com/compare/ai-batch-generator-vs-single-prompt-tools",
        },
      ],
      scripts: seo.scripts,
    };
  },
  component: ComparePage,
});

function ComparePage() {
  const rows = [
    ["Prompt workflow", "One prompt template with variables", "One manually rewritten prompt"],
    ["Best for", "Creative testing across many directions", "Single known output"],
    ["Image and video", "Designed for image and video variation workflows", "Often model-specific"],
    ["Repeatability", "Reusable templates and variable groups", "Manual prompt history"],
    [
      "Decision making",
      "Compare many outputs from controlled variables",
      "Compare isolated generations",
    ],
  ];

  return (
    <main className="mx-auto max-w-[980px] px-4 py-12">
      <section className="max-w-[760px]">
        <p className="text-sm font-medium text-accent-blue">Workflow comparison</p>
        <h1 className="mt-2 text-4xl leading-tight font-semibold tracking-tight text-foreground">
          Batch AI generator vs single-prompt AI tools
        </h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">
          Single-prompt tools are useful when you already know exactly what to create. BatchlyAI is
          better when you need to explore multiple products, scenes, styles, audiences, and image or
          video formats from one reusable prompt system.
        </p>
      </section>

      <section className="mt-10 overflow-hidden rounded-lg border bg-card">
        <div className="grid grid-cols-3 border-b bg-muted/40 px-4 py-3 text-sm font-semibold">
          <div>Criteria</div>
          <div>BatchlyAI</div>
          <div>Single-prompt tools</div>
        </div>
        {rows.map(([criteria, batchly, single]) => (
          <div
            key={criteria}
            className="grid grid-cols-3 gap-4 border-b px-4 py-4 text-sm last:border-b-0"
          >
            <div className="font-medium text-foreground">{criteria}</div>
            <div className="text-muted-foreground">{batchly}</div>
            <div className="text-muted-foreground">{single}</div>
          </div>
        ))}
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-5">
          <h2 className="text-lg font-semibold text-foreground">Choose BatchlyAI when</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
            <li>You need many variations from one product, topic, or offer.</li>
            <li>You want to test variables such as background, audience, style, and format.</li>
            <li>You need repeatable templates for image and video creative work.</li>
          </ul>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <h2 className="text-lg font-semibold text-foreground">
            Choose a single-prompt tool when
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
            <li>You only need one asset.</li>
            <li>You already know the exact scene and style.</li>
            <li>You do not need to compare controlled creative variations.</li>
          </ul>
        </div>
      </section>

      <div className="mt-8">
        <Link
          to="/"
          className="inline-flex h-10 items-center rounded-full bg-accent-blue px-5 text-sm font-medium text-white transition-colors hover:bg-accent-blue-hover"
        >
          Try BatchlyAI
        </Link>
      </div>

      <FaqSection items={comparisonFaq} />
    </main>
  );
}
