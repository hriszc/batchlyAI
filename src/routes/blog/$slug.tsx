import { createFileRoute, Link } from "@tanstack/react-router";

import { getPostBySlug } from "@/content/blog";
import type { BlogPost } from "@/content/blog";
import { createPageMeta } from "@/lib/seo/meta";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const slug = (params as { slug: string }).slug;
    return getPostBySlug(slug) || null;
  },
  head: ({ loaderData }) => {
    const seo = createPageMeta({
      title: loaderData ? `${loaderData.title} — BatchlyAI Blog` : "Blog — BatchlyAI",
      description: loaderData?.description || "BatchlyAI blog",
      path: loaderData ? `/blog/${loaderData.slug}` : "/blog",
      locale: "en",
      ogType: "article",
      jsonLd: loaderData
        ? {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: loaderData.title,
            description: loaderData.description,
            datePublished: loaderData.date,
            author: {
              "@type": "Person",
              name: loaderData.author,
            },
          }
        : undefined,
    });

    return {
      meta: seo.meta,
      links: loaderData
        ? [{ rel: "canonical", href: `https://batchlyai.com/blog/${loaderData.slug}` }]
        : [{ rel: "canonical", href: "https://batchlyai.com/blog" }],
      scripts: seo.scripts,
    };
  },
  component: BlogPostPage,
});

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-sm">
              {escapeHtml(part.slice(1, -1))}
            </code>
          );
        }
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{escapeHtml(part.slice(2, -2))}</strong>;
        }
        return <span key={i}>{escapeHtml(part)}</span>;
      })}
    </>
  );
}

function BlogPostPage() {
  const post = Route.useLoaderData() as BlogPost | null;

  if (!post) {
    return (
      <main className="mx-auto max-w-[720px] px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Post not found</h1>
        <Link to="/blog" className="mt-4 inline-block text-accent-blue hover:underline">
          Back to blog
        </Link>
      </main>
    );
  }

  // Simple markdown-to-HTML: split by double newline for paragraphs
  const paragraphs = post.content
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <main className="mx-auto max-w-[720px] px-4 py-8">
      <article>
        <header className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <time dateTime={post.date}>{post.date}</time>
            <span>·</span>
            <span>{post.author}</span>
          </div>
          <h1 className="mt-2 text-[28px] leading-tight font-semibold">{post.title}</h1>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </header>

        <div className="prose prose-neutral dark:prose-invert max-w-none">
          {paragraphs.map((block, i) => {
            // Handle headings
            if (block.startsWith("## ")) {
              return (
                <h2 key={i} className="mt-8 mb-3 text-xl font-semibold">
                  {block.slice(3)}
                </h2>
              );
            }
            if (block.startsWith("# ")) {
              return (
                <h1 key={i} className="mt-8 mb-4 text-2xl font-semibold">
                  {block.slice(2)}
                </h1>
              );
            }
            // Handle code blocks
            if (block.startsWith("```")) {
              const lines = block.split("\n");
              const codeContent = lines.slice(1, -1).join("\n");
              return (
                <pre key={i} className="my-4 overflow-x-auto rounded-lg bg-muted p-4 text-sm">
                  <code>{codeContent}</code>
                </pre>
              );
            }
            return (
              <p key={i} className="mb-4 leading-relaxed text-foreground/85">
                <InlineMarkdown text={block} />
              </p>
            );
          })}
        </div>
      </article>

      <div className="mt-12 border-t pt-6">
        <Link to="/blog" className="text-sm text-accent-blue hover:underline">
          ← Back to blog
        </Link>
      </div>
    </main>
  );
}
