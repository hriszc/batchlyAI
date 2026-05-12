import { createFileRoute } from "@tanstack/react-router";

import { HomePage } from "@/components/HomePage";
import { hreflangLinks } from "@/lib/seo/hreflang";
import { createPageMeta } from "@/lib/seo/meta";
import { softwareAppLd } from "@/lib/seo/structured-data";

const meta = createPageMeta({
  title: "BatchlyAI — Batch AI Image & Video Generator",
  description:
    "Batch-generate AI images and videos from prompt variations. Create product visuals, social content, ad creatives, and brand concepts with reusable templates.",
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
