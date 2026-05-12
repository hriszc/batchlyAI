import { createFileRoute } from "@tanstack/react-router";

import { HomePage } from "@/components/HomePage";
import { hreflangLinks } from "@/lib/seo/hreflang";
import { createPageMeta } from "@/lib/seo/meta";
import { softwareAppLd } from "@/lib/seo/structured-data";

const meta = createPageMeta({
  title: "BatchlyAI — AI 图片与视频批量生成器",
  description:
    "通过 Prompt 变量组合批量生成 AI 图片和视频，用可复用模板快速制作商品视觉、社媒内容、广告素材和品牌概念。",
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
