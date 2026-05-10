import { createFileRoute } from "@tanstack/react-router";

import { HomePage } from "@/components/HomePage";
import { hreflangLinks } from "@/lib/seo/hreflang";
import { createPageMeta } from "@/lib/seo/meta";
import { softwareAppLd } from "@/lib/seo/structured-data";

const meta = createPageMeta({
  title: "BatchlyAI — Universal AI Generator",
  description:
    "Universal AI Generator — batch generate all combinations from multi-variable prompts",
  path: "/",
  locale: "en",
  jsonLd: softwareAppLd(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    htmlAttrs: { lang: "en" },
    meta: meta.meta,
    links: [...hreflangLinks("/"), { rel: "canonical", href: "https://batchlyai.com/" }],
    scripts: meta.scripts,
  }),
  component: () => <HomePage />,
});
