import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { FaqSection } from "@/components/seo/FaqSection";
import { getExamplePage, type ExamplePage } from "@/lib/seo/geo-content";
import { createPageMeta } from "@/lib/seo/meta";
import { faqPageLd, webPageLd } from "@/lib/seo/structured-data";

export const Route = createFileRoute("/examples/$slug")({
  loader: async ({ params }) => {
    const page = getExamplePage((params as { slug: string }).slug);
    if (!page) throw notFound();
    return page;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const page = loaderData as ExamplePage;
    const seo = createPageMeta({
      title: page.title,
      description: page.description,
      path: `/examples/${page.slug}`,
      locale: "en",
      jsonLd: [
        webPageLd({
          title: page.title,
          description: page.description,
          url: `https://batchlyai.com/examples/${page.slug}`,
        }),
        faqPageLd(page.faq),
      ],
    });

    return {
      htmlAttrs: { lang: "en" },
      meta: seo.meta,
      links: [{ rel: "canonical", href: `https://batchlyai.com/examples/${page.slug}` }],
      scripts: seo.scripts,
    };
  },
  component: ExamplePageView,
});

function ExamplePageView() {
  const page = Route.useLoaderData() as ExamplePage;

  return (
    <main className="mx-auto max-w-[980px] px-4 py-12">
      <section className="max-w-[760px]">
        <p className="text-sm font-medium text-accent-blue">BatchlyAI example</p>
        <h1 className="mt-2 text-4xl leading-tight font-semibold tracking-tight text-foreground">
          {page.h1}
        </h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">{page.description}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Best for:</span> {page.audience}
        </p>
      </section>

      <section className="mt-10 rounded-lg border bg-card p-5">
        <h2 className="text-lg font-semibold text-foreground">Reusable prompt template</h2>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-muted p-4 text-sm leading-6 whitespace-pre-wrap text-foreground">
          {page.promptTemplate}
        </pre>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-5">
          <h2 className="text-lg font-semibold text-foreground">Variables to test</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {page.variables.map((variable) => (
              <li key={variable}>{variable}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <h2 className="text-lg font-semibold text-foreground">Expected outcomes</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
            {page.outcomes.map((outcome) => (
              <li key={outcome}>{outcome}</li>
            ))}
          </ul>
        </div>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          to="/"
          className="inline-flex h-10 items-center rounded-full bg-accent-blue px-5 text-sm font-medium text-white transition-colors hover:bg-accent-blue-hover"
        >
          Use this workflow
        </Link>
        <Link
          to="/discover"
          search={{ tab: "templates" }}
          className="inline-flex h-10 items-center rounded-full border px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Browse templates
        </Link>
      </div>

      <FaqSection title={`FAQ about ${page.h1}`} items={page.faq} />
    </main>
  );
}
