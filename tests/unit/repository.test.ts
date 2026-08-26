import { describe, expect, it } from "vitest";
import { demoAudit } from "../../lib/demo-data";
import { DEMO_REPOSITORY_ID, createDemoRepository } from "../../lib/repository/demo";
import {
  listDemoRepositoryFiles,
  readDemoRepositoryFile,
} from "../../lib/repository/files";
import { resolveIssueSource } from "../../lib/repository/mapping";

describe("controlled repository connector", () => {
  it("lists and reads the checked-in demo source", async () => {
    const files = await listDemoRepositoryFiles();
    const hero = await readDemoRepositoryFile("components/Hero.tsx");

    expect(files).toHaveLength(5);
    expect(files.map((file) => file.path)).toContain("app/layout.tsx");
    expect(hero.language).toBe("TSX");
    expect(hero.content).toContain('alt=""');
  });

  it("rejects paths outside the connected repository", async () => {
    await expect(readDemoRepositoryFile("../package.json")).rejects.toMatchObject({
      code: "path_not_allowed",
      status: 403,
    });
    await expect(readDemoRepositoryFile("components\\Hero.tsx")).rejects.toMatchObject({
      code: "invalid_path",
      status: 400,
    });
  });

  it("resolves an audit hint to a bounded source range", async () => {
    const issue = demoAudit.issues.find((candidate) => candidate.id === "issue_img_alt");
    const repository = createDemoRepository();

    expect(repository.id).toBe(DEMO_REPOSITORY_ID);
    expect(issue).toBeDefined();

    const source = await resolveIssueSource(repository, issue!);

    expect(source).toMatchObject({
      filePath: "components/Hero.tsx",
      lineStart: 15,
      lineEnd: 20,
      confidence: 0.94,
    });
    expect(source.content).toContain("hero.webp");
  });
});
