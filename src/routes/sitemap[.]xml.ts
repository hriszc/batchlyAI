import { createFileRoute } from "@tanstack/react-router";
import { desc, eq } from "drizzle-orm";

import { blogPosts } from "@/content/blog";
import { getD1Binding } from "@/lib/cloudflare/bindings";
import { getDb } from "@/lib/db";
import { template as templateTable, work } from "@/lib/db/schema";
import { examplePages } from "@/lib/seo/geo-content";
import { seoLandingPages } from "@/lib/seo/landing-pages";

interface SitemapUrl {
  loc: string;
  changefreq: "daily" | "weekly" | "monthly";
  priority: string;
}

const BASE_URL = "https://batchlyai.com";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function renderSitemap(urls: SitemapUrl[]): string {
  const items = urls
    .map(
      (url) => `  <url>
    <loc>${escapeXml(url.loc)}</loc>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</urlset>`;
}

async function createSitemapResponse(): Promise<Response> {
  const urls: SitemapUrl[] = [
    { loc: `${BASE_URL}/`, changefreq: "daily", priority: "1.0" },
    { loc: `${BASE_URL}/cn`, changefreq: "daily", priority: "0.9" },
    { loc: `${BASE_URL}/discover`, changefreq: "daily", priority: "0.8" },
    { loc: `${BASE_URL}/blog`, changefreq: "weekly", priority: "0.7" },
    { loc: `${BASE_URL}/about`, changefreq: "monthly", priority: "0.6" },
    {
      loc: `${BASE_URL}/compare/ai-batch-generator-vs-single-prompt-tools`,
      changefreq: "monthly",
      priority: "0.8",
    },
    ...seoLandingPages.map((page) => ({
      loc: `${BASE_URL}/tools/${page.slug}`,
      changefreq: "weekly" as const,
      priority: "0.8",
    })),
    ...examplePages.map((page) => ({
      loc: `${BASE_URL}/examples/${page.slug}`,
      changefreq: "monthly" as const,
      priority: "0.7",
    })),
    ...blogPosts.map((post) => ({
      loc: `${BASE_URL}/blog/${post.slug}`,
      changefreq: "monthly" as const,
      priority: "0.7",
    })),
  ];

  const binding = getD1Binding();
  if (binding) {
    let templates: Array<{ slug: string }> = [];
    let works: Array<{ id: string }> = [];

    try {
      const db = getDb(binding);
      [templates, works] = await Promise.all([
        db
          .select({ slug: templateTable.slug })
          .from(templateTable)
          .where(eq(templateTable.isPublic, true))
          .orderBy(desc(templateTable.usageCount), desc(templateTable.createdAt))
          .limit(500),
        db
          .select({ id: work.id })
          .from(work)
          .where(eq(work.isPublished, 1))
          .orderBy(desc(work.publishedAt))
          .limit(500),
      ]);
    } catch (error) {
      console.warn("[sitemap] dynamic URLs unavailable", error);
    }

    urls.push(
      ...templates.map((item) => ({
        loc: `${BASE_URL}/templates/${item.slug}`,
        changefreq: "weekly" as const,
        priority: "0.7",
      })),
      ...works.map((item) => ({
        loc: `${BASE_URL}/works/${item.id}`,
        changefreq: "weekly" as const,
        priority: "0.6",
      })),
    );
  }

  return new Response(renderSitemap(urls), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: createSitemapResponse,
    },
  },
});
