import { createFileRoute } from "@tanstack/react-router";

import { createPageMeta } from "@/lib/seo/meta";
import { organizationLd, webPageLd } from "@/lib/seo/structured-data";

const title = "Terms of Service — BatchlyAI";
const description =
  "Read the BatchlyAI Terms of Service for account access, credits, AI generation, acceptable use, and support.";

export const Route = createFileRoute("/terms")({
  head: () => {
    const seo = createPageMeta({
      title,
      description,
      path: "/terms",
      locale: "en",
      jsonLd: [
        organizationLd(),
        webPageLd({
          title,
          description,
          url: "https://batchlyai.com/terms",
          type: "WebPage",
        }),
      ],
    });

    return {
      htmlAttrs: { lang: "en" },
      meta: seo.meta,
      links: [{ rel: "canonical", href: "https://batchlyai.com/terms" }],
      scripts: seo.scripts,
    };
  },
  component: TermsPage,
});

const sections = [
  [
    "Use of the service",
    "BatchlyAI provides tools for generating images, videos, and text from user prompts and uploaded inputs. You are responsible for the prompts, files, and other content you submit, and for making sure your use of generated outputs complies with applicable laws and third-party rights.",
  ],
  [
    "Accounts and security",
    "You are responsible for keeping your account credentials secure. You must provide accurate account information and may not use another person's account without permission.",
  ],
  [
    "Credits and generation failures",
    "Some generation requests require credits. Credits are deducted when a generation job is created. If an eligible generation job fails or times out without producing usable output, BatchlyAI will attempt to return the corresponding credits to your account automatically.",
  ],
  [
    "Acceptable use",
    "You may not use BatchlyAI to create unlawful, abusive, deceptive, infringing, or harmful content, or to interfere with the availability, security, or integrity of the service.",
  ],
  [
    "AI output",
    "AI-generated output can be inaccurate, incomplete, or similar to content generated for others. You should review outputs before relying on them or publishing them.",
  ],
  [
    "Changes and availability",
    "We may update, suspend, or discontinue parts of BatchlyAI as the product evolves. We may also update these terms, and continued use of the service means you accept the updated terms.",
  ],
  ["Contact", "Questions about these terms can be sent to support@batchlyai.com."],
] as const;

function TermsPage() {
  return (
    <main className="mx-auto max-w-[860px] px-4 py-12">
      <section>
        <p className="text-sm font-medium text-accent-blue">Terms of Service</p>
        <h1 className="mt-2 text-4xl leading-tight font-semibold tracking-tight text-foreground">
          BatchlyAI Terms of Service
        </h1>
        <p className="mt-5 text-sm leading-7 text-muted-foreground">Last updated: May 15, 2026</p>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">
          These terms govern your access to and use of BatchlyAI. By using the service, you agree to
          these terms.
        </p>
      </section>

      <section className="mt-10 space-y-8">
        {sections.map(([heading, body]) => (
          <div key={heading}>
            <h2 className="text-xl font-semibold text-foreground">{heading}</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
