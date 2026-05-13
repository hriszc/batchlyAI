import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { FaqSection } from "@/components/seo/FaqSection";
import { getSeoLandingPage, seoLandingPages, type SeoLandingPage } from "@/lib/seo/landing-pages";
import { createPageMeta } from "@/lib/seo/meta";
import { faqPageLd, webPageLd } from "@/lib/seo/structured-data";

export const Route = createFileRoute("/tools/$slug")({
  loader: async ({ params }) => {
    const page = getSeoLandingPage((params as { slug: string }).slug);
    if (!page) throw notFound();
    return page;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const page: SeoLandingPage = loaderData;
    const seo = createPageMeta({
      title: page.title,
      description: page.description,
      path: `/tools/${page.slug}`,
      locale: "en",
      jsonLd: [
        webPageLd({
          title: page.title,
          description: page.description,
          url: `https://batchlyai.com/tools/${page.slug}`,
        }),
        faqPageLd(page.faq),
      ],
    });

    return {
      htmlAttrs: { lang: "en" },
      meta: seo.meta,
      links: [{ rel: "canonical", href: `https://batchlyai.com/tools/${page.slug}` }],
      scripts: seo.scripts,
    };
  },
  component: ToolLandingPage,
});

function ToolLandingPage() {
  const page = Route.useLoaderData() as SeoLandingPage;
  const relatedPages = seoLandingPages.filter((item) => item.slug !== page.slug).slice(0, 3);
  const templateSearch = { tab: "templates" as const };

  return (
    <main className="mx-auto max-w-[980px] px-4 py-10">
      <div className="max-w-[720px]">
        <p className="text-sm font-medium text-accent-blue">
          {page.mediaType === "both" ? "Image and video workflow" : `${page.mediaType} workflow`}
        </p>
        <h1 className="mt-2 text-4xl leading-tight font-semibold text-foreground">{page.h1}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{page.description}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/"
            className="inline-flex h-10 items-center justify-center rounded-full bg-accent-blue px-5 text-sm font-medium text-white transition-colors hover:bg-accent-blue-hover"
          >
            Start generating
          </Link>
          <Link
            to="/discover"
            search={templateSearch}
            className="inline-flex h-10 items-center justify-center rounded-full border px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Browse templates
          </Link>
        </div>
      </div>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {page.primaryUseCases.map((useCase: string) => (
          <div key={useCase} className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">{useCase}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Use prompt variables to compare directions without rebuilding every prompt by hand.
            </p>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-foreground">Example workflows</h2>
        <div className="mt-4 grid gap-3">
          {page.examples.map((example: string) => (
            <div
              key={example}
              className="rounded-lg border bg-muted/30 p-4 text-sm text-foreground"
            >
              {example}
            </div>
          ))}
        </div>
      </section>

      <FaqSection
        title={`FAQ about ${page.h1}`}
        description="Short answers for search engines, AI answer engines, and users comparing generation workflows."
        items={page.faq}
      />

      <section className="mt-10 border-t pt-8">
        <h2 className="text-xl font-semibold text-foreground">Related AI generation tools</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {relatedPages.map((item) => (
            <Link
              key={item.slug}
              to="/tools/$slug"
              params={{ slug: item.slug }}
              className="rounded-full bg-muted px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
            >
              {item.h1}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
