import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

import { HomePage } from "@/components/HomePage";
import {
  buildCnRedirectHref,
  getLanguageCookie,
  shouldRedirectRootToCn,
} from "@/lib/i18n/locale-routing";
import { homepageFaq } from "@/lib/seo/geo-content";
import { hreflangLinks } from "@/lib/seo/hreflang";
import { createPageMeta } from "@/lib/seo/meta";
import { faqPageLd, organizationLd, softwareAppLd } from "@/lib/seo/structured-data";

const meta = createPageMeta({
  title: "BatchlyAI — Batch AI Image & Video Generator",
  description:
    "Batch-generate AI images and videos from prompt variations. Create product visuals, social content, ad creatives, and brand concepts with reusable templates.",
  path: "/",
  locale: "en",
  jsonLd: [softwareAppLd(), organizationLd(), faqPageLd(homepageFaq)],
});

const getRootLocaleRequest = createServerFn({ method: "GET" }).handler(async () => ({
  acceptLanguage: getRequestHeader("accept-language") || "",
  cookie: getRequestHeader("cookie") || "",
  userAgent: getRequestHeader("user-agent") || "",
}));

export const Route = createFileRoute("/")({
  beforeLoad: async ({ location }) => {
    const { acceptLanguage, cookie, userAgent } = await getRootLocaleRequest();
    const storedLanguage = getLanguageCookie(cookie);
    if (
      shouldRedirectRootToCn({
        pathname: location.pathname,
        storedLanguage,
        acceptLanguage,
        userAgent,
      })
    ) {
      throw redirect({
        href: buildCnRedirectHref(location.searchStr),
        statusCode: 302,
      });
    }
  },
  head: () => ({
    htmlAttrs: { lang: "en" },
    meta: meta.meta,
    links: [...hreflangLinks("/"), { rel: "canonical", href: "https://batchlyai.com/" }],
    scripts: meta.scripts,
  }),
  component: () => <HomePage forceLanguage="en" showTaaftBadge />,
});
