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
    exclude: ["**/e2e/**", "**/node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/routeTree.gen.ts", "src/components/ui/**", "**/*.d.ts", "src/styles.css"],
      thresholds: {
        statements: 30,
        branches: 22,
        functions: 30,
        lines: 30,
        "src/components/universal-generator/utils.ts": {
          statements: 95,
          branches: 80,
          functions: 100,
          lines: 95,
        },
        "src/components/universal-generator/useGeneratorState.ts": {
          statements: 60,
          branches: 40,
          functions: 75,
          lines: 60,
        },
        "src/lib/rate-limit.ts": {
          statements: 78,
          branches: 70,
          functions: 100,
          lines: 78,
        },
        "src/lib/auth/password.ts": {
          statements: 95,
          branches: 85,
          functions: 100,
          lines: 95,
        },
        "src/lib/stripe.ts": {
          statements: 80,
          branches: 70,
          functions: 100,
          lines: 80,
        },
      },
    },
  },
});
