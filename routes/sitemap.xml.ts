import { desc, eq } from "drizzle-orm";
import { defineHandler } from "nitro";

import { blogPosts } from "../src/content/blog";
import { getD1Binding } from "../src/lib/cloudflare/bindings";
import { getDb } from "../src/lib/db";
import { template as templateTable, work } from "../src/lib/db/schema";
import { seoLandingPages } from "../src/lib/seo/landing-pages";

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

export default defineHandler(async () => {
  const urls: SitemapUrl[] = [
    { loc: `${BASE_URL}/`, changefreq: "daily", priority: "1.0" },
    { loc: `${BASE_URL}/cn`, changefreq: "daily", priority: "0.9" },
    { loc: `${BASE_URL}/discover`, changefreq: "daily", priority: "0.8" },
    { loc: `${BASE_URL}/blog`, changefreq: "weekly", priority: "0.7" },
    ...seoLandingPages.map((page) => ({
      loc: `${BASE_URL}/tools/${page.slug}`,
      changefreq: "weekly" as const,
      priority: "0.8",
    })),
    ...blogPosts.map((post) => ({
      loc: `${BASE_URL}/blog/${post.slug}`,
      changefreq: "monthly" as const,
      priority: "0.7",
    })),
  ];

  const binding = getD1Binding();
  if (binding) {
    const db = getDb(binding);
    const [templates, works] = await Promise.all([
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
});
