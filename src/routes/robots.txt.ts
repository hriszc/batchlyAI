import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/robots/txt")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const content = ["User-agent: *", "Allow: /", "", `Sitemap: ${origin}/sitemap.xml`].join(
          "\n",
        );

        return new Response(content, {
          status: 200,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      },
    },
  },
});
