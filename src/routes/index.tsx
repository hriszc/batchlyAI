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
      { rel: "alternate", href: "https://batchlyai.com/cn", hrefLang: "zh-CN" },
      { rel: "alternate", href: "https://batchlyai.com/", hrefLang: "en" },
      { rel: "canonical", href: "https://batchlyai.com/" },
    ],
  }),
  component: () => <HomePage forceLanguage="en" />,
});
