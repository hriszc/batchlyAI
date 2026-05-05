import { createFileRoute, Link } from "@tanstack/react-router";

import { blogPosts } from "@/content/blog";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Blog — BatchlyAI" },
      {
        name: "description",
        content: "Tips, guides, and best practices for AI batch generation",
      },
    ],
  }),
  component: BlogIndexPage,
});

function BlogIndexPage() {
  return (
    <main className="mx-auto max-w-[720px] px-4 py-8">
      <h1 className="text-2xl font-semibold">BatchlyAI Blog</h1>
      <p className="mt-1 text-muted-foreground">
        Tips, guides, and best practices for AI batch generation
      </p>

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
            <h2 className="mt-2 text-lg font-semibold hover:text-[#0071e3]">{post.title}</h2>
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
