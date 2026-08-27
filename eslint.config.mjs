import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    ".vercel/**",
    "playwright-report/**",
    "test-results/**",
    "videos/**",
    "demo-repo/**",
    "next-env.d.ts",
  ]),
]);
