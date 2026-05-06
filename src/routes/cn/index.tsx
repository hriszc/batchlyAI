import { createFileRoute } from "@tanstack/react-router";

import { HomePage } from "@/components/HomePage";
import { hreflangLinks } from "@/lib/seo/hreflang";
import { createPageMeta } from "@/lib/seo/meta";
import { softwareAppLd } from "@/lib/seo/structured-data";

const meta = createPageMeta({
  title: "BatchlyAI — 万能 AI 生成器",
  description: "万能 AI 生成器 — 一次输入多组变量，批量生成所有组合结果",
  path: "/cn",
  locale: "zh-CN",
  jsonLd: softwareAppLd(),
});

export const Route = createFileRoute("/cn/")({
  head: () => ({
    htmlAttrs: { lang: "zh-CN" },
    meta: meta.meta,
    links: [...hreflangLinks("/cn"), { rel: "canonical", href: "https://batchlyai.com/cn" }],
    scripts: meta.scripts,
  }),
  component: () => <HomePage forceLanguage="zh" />,
});
