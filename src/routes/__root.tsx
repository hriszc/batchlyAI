import { a11yDevtoolsPlugin } from "@tanstack/devtools-a11y/react";
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

import { GoogleOneTap } from "@/components/GoogleOneTap";
import { SettingsBar } from "@/components/SettingsBar";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { env } from "@/env/client";
import type { AuthQueryResult } from "@/lib/auth/queries";
import { LanguageProvider, useLanguage } from "@/lib/i18n/LanguageContext";
import { createPageMeta } from "@/lib/seo/meta";
import { softwareAppLd } from "@/lib/seo/structured-data";

import appCss from "@/styles.css?url";

interface MyRouterContext {
  queryClient: QueryClient;
  user: AuthQueryResult;
}

const rootSeo = createPageMeta({
  title: "BatchlyAI — Universal AI Generator",
  description:
    "Universal AI Generator — batch generate all combinations from multi-variable prompts",
  path: "/",
  locale: "en",
  ogImage: "https://batchlyai.com/logo-light.png",
  jsonLd: softwareAppLd(),
});

// Blocking inline script: prevents theme flash by setting the theme class
// before the browser paints the first frame.
const themeScript = `!function(){try{var t=localStorage.getItem("theme");if(t!=='light'&&t!=='dark'&&t!=='system'){t='system'}var d=matchMedia('(prefers-color-scheme: dark)').matches;var r=t==='system'?(d?'dark':'light'):t;var e=document.documentElement;e.classList.add(r);e.style.colorScheme=r;e.dataset.theme=r}catch(e){}}()`;

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#f5f5f7", media: "(prefers-color-scheme: light)" },
      { name: "theme-color", content: "#1a1a1a", media: "(prefers-color-scheme: dark)" },
      ...rootSeo.meta,
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
    ],
    scripts: [
      // Theme script must be blocking and before any other scripts to prevent FOUC
      { type: "text/javascript", children: themeScript },
      ...rootSeo.scripts,
      ...(env.VITE_GA4_MEASUREMENT_ID
        ? [
            {
              src: `https://www.googletagmanager.com/gtag/js?id=${env.VITE_GA4_MEASUREMENT_ID}`,
              async: true,
            },
            {
              type: "text/javascript",
              children: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${env.VITE_GA4_MEASUREMENT_ID}');`,
            },
          ]
        : []),
    ],
  }),
  shellComponent: RootDocument,
});

function SupportEmail() {
  const { t } = useLanguage();
  return <p className="mt-1 text-xs text-muted-foreground/50">{t("supportEmail")}</p>;
}

function RootDocument({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          <LanguageProvider>
            <SettingsBar />
            <GoogleOneTap />
            {children}
            <footer className="mt-auto border-t py-6 text-center">
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <a href="/blog" className="transition-colors hover:text-foreground">
                  Blog
                </a>
                <a href="/templates" className="transition-colors hover:text-foreground">
                  Templates
                </a>
                <a href="/discover" className="transition-colors hover:text-foreground">
                  Discover
                </a>
              </div>
              <p className="mt-2 text-xs text-muted-foreground/50">
                &copy; {new Date().getFullYear()} BatchlyAI
              </p>
              <SupportEmail />
            </footer>
            <Toaster richColors />
          </LanguageProvider>
        </ThemeProvider>

        <TanStackDevtools
          plugins={[
            { name: "TanStack Query", render: <ReactQueryDevtoolsPanel /> },
            { name: "TanStack Router", render: <TanStackRouterDevtoolsPanel /> },
            a11yDevtoolsPlugin(),
          ]}
        />

        <Scripts />
      </body>
    </html>
  );
}
