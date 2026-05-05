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
import type { AuthQueryResult } from "@/lib/auth/queries";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";

import appCss from "@/styles.css?url";

interface MyRouterContext {
  queryClient: QueryClient;
  user: AuthQueryResult;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "BatchlyAI" },
      {
        name: "description",
        content:
          "Universal AI Generator — batch generate all combinations from multi-variable prompts",
      },
      { property: "og:title", content: "BatchlyAI — Universal AI Generator" },
      {
        property: "og:description",
        content:
          "Universal AI Generator — batch generate all combinations from multi-variable prompts",
      },
      { property: "og:image", content: "https://batchlyai.com/logo-light.png" },
      { property: "og:url", content: "https://batchlyai.com" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://batchlyai.com/logo-light.png" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "BatchlyAI",
          description:
            "Universal AI Generator — batch generate all combinations from multi-variable prompts",
          url: "https://batchlyai.com",
          applicationCategory: "Multimedia",
          operatingSystem: "Web",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
          },
        }),
      },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          <LanguageProvider>
            <SettingsBar />
            <GoogleOneTap />
            {children}
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
