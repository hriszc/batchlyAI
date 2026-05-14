import { createFileRoute } from "@tanstack/react-router";

const BASE_URL = "https://batchlyai.com";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () => {
        const content = [
          "User-agent: *",
          "Allow: /",
          "Disallow: /api/",
          "",
          `Sitemap: ${BASE_URL}/sitemap.xml`,
        ].join("\n");

        return new Response(content, {
          status: 200,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      },
    },
  },
});
