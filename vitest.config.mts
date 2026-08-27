import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [
      "node_modules/**",
      ".next/**",
      ".vercel/**",
      "tests/e2e/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
});
