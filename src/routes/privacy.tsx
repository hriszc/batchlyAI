import { createFileRoute } from "@tanstack/react-router";

import { createPageMeta } from "@/lib/seo/meta";
import { organizationLd, webPageLd } from "@/lib/seo/structured-data";

const title = "Privacy Policy — BatchlyAI";
const description =
  "Read the BatchlyAI Privacy Policy covering account data, prompts, uploads, analytics, payments, cookies, and data retention.";

export const Route = createFileRoute("/privacy")({
  head: () => {
    const seo = createPageMeta({
      title,
      description,
      path: "/privacy",
      locale: "en",
      jsonLd: [
        organizationLd(),
        webPageLd({
          title,
          description,
          url: "https://batchlyai.com/privacy",
          type: "WebPage",
        }),
      ],
    });

    return {
      htmlAttrs: { lang: "en" },
      meta: seo.meta,
      links: [{ rel: "canonical", href: "https://batchlyai.com/privacy" }],
      scripts: seo.scripts,
    };
  },
  component: PrivacyPage,
});

const sections = [
  [
    "Information we collect",
    "We collect information you provide when creating an account, signing in, buying credits, contacting support, entering prompts, uploading files, or generating outputs. This can include your email address, name, prompts, uploaded images or files, generated results, and usage history.",
  ],
  [
    "How we use information",
    "We use information to operate BatchlyAI, process generation requests, maintain your account and credit balance, provide support, improve reliability, prevent abuse, and understand product usage.",
  ],
  [
    "Payments",
    "Payments are handled by third-party payment providers such as Stripe. BatchlyAI does not store full payment card numbers.",
  ],
  [
    "Analytics and cookies",
    "We may use cookies, local storage, and analytics tools such as Google Analytics to measure site traffic, diagnose issues, remember preferences, and improve the product.",
  ],
  [
    "Sharing",
    "We share information with service providers that help us run the product, including authentication, hosting, storage, AI generation, analytics, and payment providers. We may also disclose information when required by law or to protect the service and users.",
  ],
  [
    "Retention",
    "We retain account, generation, and support data for as long as needed to provide the service, comply with legal obligations, resolve disputes, prevent abuse, and maintain business records.",
  ],
  [
    "Your choices",
    "You can contact us to request help with account or privacy questions. Some information may be retained where required for security, legal, or operational reasons.",
  ],
  ["Contact", "Privacy questions can be sent to support@batchlyai.com."],
] as const;

function PrivacyPage() {
  return (
    <main className="mx-auto max-w-[860px] px-4 py-12">
      <section>
        <p className="text-sm font-medium text-accent-blue">Privacy Policy</p>
        <h1 className="mt-2 text-4xl leading-tight font-semibold tracking-tight text-foreground">
          BatchlyAI Privacy Policy
        </h1>
        <p className="mt-5 text-sm leading-7 text-muted-foreground">Last updated: May 15, 2026</p>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">
          This policy explains what information BatchlyAI collects, how we use it, and the choices
          available to users.
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
