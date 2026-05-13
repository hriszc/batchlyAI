import { createFileRoute, Link } from "@tanstack/react-router";

import { FaqSection } from "@/components/seo/FaqSection";
import { aboutFaq } from "@/lib/seo/geo-content";
import { createPageMeta } from "@/lib/seo/meta";
import { faqPageLd, organizationLd, webPageLd } from "@/lib/seo/structured-data";

const title = "About BatchlyAI — Batch AI Image and Video Generator";
const description =
  "Learn what BatchlyAI is, who it is for, and how to contact the team behind the batch AI image and video generation workflow.";

export const Route = createFileRoute("/about")({
  head: () => {
    const seo = createPageMeta({
      title,
      description,
      path: "/about",
      locale: "en",
      jsonLd: [
        organizationLd(),
        webPageLd({
          title,
          description,
          url: "https://batchlyai.com/about",
          type: "AboutPage",
        }),
        faqPageLd(aboutFaq),
      ],
    });

    return {
      htmlAttrs: { lang: "en" },
      meta: seo.meta,
      links: [{ rel: "canonical", href: "https://batchlyai.com/about" }],
      scripts: seo.scripts,
    };
  },
  component: AboutPage,
});

function AboutPage() {
  return (
    <main className="mx-auto max-w-[980px] px-4 py-12">
      <section className="max-w-[760px]">
        <p className="text-sm font-medium text-accent-blue">About BatchlyAI</p>
        <h1 className="mt-2 text-4xl leading-tight font-semibold tracking-tight text-foreground">
          Batch AI generation for teams that need more than one good prompt
        </h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">
          BatchlyAI is a batch AI image and video generator for reusable prompt templates. It helps
          users define controlled variables, generate every combination, and compare creative
          directions without rebuilding prompts by hand.
        </p>
      </section>

      <section className="mt-12 grid gap-4 md:grid-cols-3">
        {[
          ["Built for", "Ecommerce teams, marketers, creators, designers, and prompt engineers."],
          [
            "Best used for",
            "Product visuals, ad creatives, social covers, thumbnails, and video concepts.",
          ],
          ["Contact", "support@batchlyai.com"],
        ].map(([heading, body]) => (
          <div key={heading} className="rounded-lg border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">{heading}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>

      <section className="mt-12 rounded-lg border bg-muted/25 p-6">
        <h2 className="text-xl font-semibold text-foreground">How BatchlyAI is different</h2>
        <p className="mt-3 max-w-[780px] text-sm leading-6 text-muted-foreground">
          A normal AI generator is optimized for one prompt at a time. BatchlyAI is optimized for
          creative exploration: one template, many variables, every combination. That makes it
          easier to compare scenes, styles, audiences, formats, and image or video directions in a
          repeatable workflow.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            to="/compare/ai-batch-generator-vs-single-prompt-tools"
            className="inline-flex h-10 items-center rounded-full bg-accent-blue px-5 text-sm font-medium text-white transition-colors hover:bg-accent-blue-hover"
          >
            Compare workflows
          </Link>
          <Link
            to="/examples/$slug"
            params={{ slug: "product-visuals" }}
            className="inline-flex h-10 items-center rounded-full border px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            See examples
          </Link>
        </div>
      </section>

      <FaqSection items={aboutFaq} />
    </main>
  );
}
