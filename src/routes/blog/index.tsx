import { createFileRoute, Link } from "@tanstack/react-router";

import { blogPosts } from "@/content/blog";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { createPageMeta } from "@/lib/seo/meta";

const blogIndexSeo = createPageMeta({
  title: "Blog — BatchlyAI",
  description: "Tips, guides, and best practices for AI batch generation",
  path: "/blog",
  locale: "en",
});

export const Route = createFileRoute("/blog/")({
  head: () => ({
    htmlAttrs: { lang: "en" },
    meta: blogIndexSeo.meta,
    links: [{ rel: "canonical", href: "https://batchlyai.com/blog" }],
  }),
  component: BlogIndexPage,
});

function BlogIndexPage() {
  const { t } = useLanguage();
  return (
    <main className="mx-auto max-w-[720px] px-4 py-8">
      <h1 className="text-2xl font-semibold">{t("blogTitle")}</h1>
      <p className="mt-1 text-muted-foreground">{t("blogDescription")}</p>

      <div className="mt-8 space-y-6">
        {blogPosts.map((post) => (
          <Link
            key={post.slug}
            to="/blog/$slug"
            params={{ slug: post.slug }}
            className="block rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <time dateTime={post.date}>{post.date}</time>
              <span>·</span>
              <span>{post.author}</span>
            </div>
            <h2 className="mt-2 text-lg font-semibold hover:text-accent-blue">{post.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{post.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
