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
    scripts: [
      // Blocking redirect: Chinese browsers → /cn before first paint
      {
        type: "text/javascript",
        children: `!function(){if(window.location.pathname.startsWith("/cn"))return;try{var s=localStorage.getItem("language");if(s==="en")return;if(s==="zh"){window.location.replace("/cn");return}}catch(e){}var l=(navigator.language||"").toLowerCase();if(l.startsWith("zh")){window.location.replace("/cn")}}()`,
      },
      ...meta.scripts,
    ],
  }),
  component: () => <HomePage />,
});
