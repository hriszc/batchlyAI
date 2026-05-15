import { resolve } from "path";

import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "#test": resolve(__dirname, "./tests"),
    },
  },
  plugins: [tailwindcss()],
  test: {
    globals: false,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["**/__tests__/**/*.test.{ts,tsx}"],
    exclude: ["**/e2e/**", "**/node_modules/**", "**/.claude/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/routeTree.gen.ts",
        "src/router.tsx",
        "src/components/ui/**",
        "src/content/blog/**",
        "src/env/client.ts",
        "**/*.d.ts",
        "src/lib/db/schema/**",
        "src/routes/**/*.tsx",
        "src/routes/api/auth/$.ts",
        "src/routes/api/diag/**",
        "src/routes/robots*.ts",
        "src/routes/sitemap*.ts",
        "src/styles.css",
        "src/env/server.ts",
      ],
      thresholds: {
        statements: 60,
        branches: 60,
        functions: 60,
        lines: 60,
        "src/components/universal-generator/utils.ts": {
          statements: 90,
          branches: 75,
          functions: 95,
          lines: 90,
        },
        "src/components/universal-generator/useGeneratorState.ts": {
          statements: 50,
          branches: 30,
          functions: 60,
          lines: 50,
        },
        "src/lib/rate-limit.ts": {
          statements: 75,
          branches: 65,
          functions: 95,
          lines: 75,
        },
        "src/lib/auth/password.ts": {
          statements: 90,
          branches: 80,
          functions: 95,
          lines: 90,
        },
        "src/lib/stripe.ts": {
          statements: 75,
          branches: 65,
          functions: 95,
          lines: 75,
        },
      },
    },
  },
});
