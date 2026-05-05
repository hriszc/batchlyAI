import { createFileRoute } from "@tanstack/react-router";

import { HomePage } from "@/components/HomePage";

export const Route = createFileRoute("/cn/")({
  head: () => ({
    htmlAttrs: { lang: "zh-CN" },
    meta: [
      { title: "BatchlyAI — 万能 AI 生成器" },
      { name: "description", content: "万能 AI 生成器 — 一次输入多组变量，批量生成所有组合结果" },
    ],
    links: [
      { rel: "alternate", href: "https://batchlyai.com/cn", hrefLang: "zh-CN" },
      { rel: "alternate", href: "https://batchlyai.com/", hrefLang: "en" },
      { rel: "canonical", href: "https://batchlyai.com/cn" },
    ],
  }),
  component: () => <HomePage forceLanguage="zh" />,
});
