import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sitemap/xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const urls = [
          { loc: `${origin}/`, priority: "1.0", changefreq: "daily" },
          { loc: `${origin}/cn`, priority: "0.9", changefreq: "daily" },
          { loc: `${origin}/login`, priority: "0.5", changefreq: "monthly" },
          { loc: `${origin}/signup`, priority: "0.7", changefreq: "monthly" },
        ];

        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
          '  xmlns:xhtml="http://www.w3.org/1999/xhtml">',
          ...urls
            .map((u) => [
              "  <url>",
              `    <loc>${u.loc}</loc>`,
              `    <priority>${u.priority}</priority>`,
              `    <changefreq>${u.changefreq}</changefreq>`,
              `    <xhtml:link rel="alternate" hreflang="en" href="${origin}/" />`,
              `    <xhtml:link rel="alternate" hreflang="zh-CN" href="${origin}/cn" />`,
              "  </url>",
            ])
            .flat(),
          "</urlset>",
        ].join("\n");

        return new Response(xml, {
          status: 200,
          headers: { "Content-Type": "application/xml; charset=utf-8" },
        });
      },
    },
  },
});
