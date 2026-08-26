import type { RepositoryConnection } from "./types";

export const DEMO_REPOSITORY_ID = "repo_demo_001";

export const DEMO_REPOSITORY_FILES = [
  "README.md",
  "components/Hero.tsx",
  "components/NewsletterForm.tsx",
  "app/features/page.tsx",
  "app/layout.tsx",
] as const;

export function createDemoRepository(): RepositoryConnection {
  return {
    id: DEMO_REPOSITORY_ID,
    provider: "demo",
    owner: "mend",
    name: "demo-site",
    fullName: "mend/demo-site",
    branch: "main",
    visibility: "public",
    fileCount: DEMO_REPOSITORY_FILES.length,
    connectedAt: new Date().toISOString(),
  };
}
