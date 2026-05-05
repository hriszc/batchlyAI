import { createFileRoute } from "@tanstack/react-router";

import { HomePage } from "@/components/HomePage";

export const Route = createFileRoute("/")({
  head: () => ({
    htmlAttrs: { lang: "en" },
    meta: [
      { title: "BatchlyAI — Universal AI Generator" },
      {
        name: "description",
        content:
          "Universal AI Generator — batch generate all combinations from multi-variable prompts",
      },
    ],
    links: [
      { rel: "alternate", href: "https://batchlyai.hriszc.workers.dev/cn", hrefLang: "zh-CN" },
      { rel: "alternate", href: "https://batchlyai.hriszc.workers.dev/", hrefLang: "en" },
      { rel: "canonical", href: "https://batchlyai.hriszc.workers.dev/" },
    ],
  }),
  component: () => <HomePage forceLanguage="en" />,
});
