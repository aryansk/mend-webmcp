import { afterEach, describe, expect, it } from "vitest";
import { demoIssues } from "../../lib/demo-data";
import { generateProposedFix } from "../../lib/fixes/generator";
import { clearFixStore } from "../../lib/fixes/store";
import { readDemoRepositoryFile } from "../../lib/repository/files";
import { createDemoRepository } from "../../lib/repository/demo";

afterEach(() => {
  clearFixStore();
});

describe("deterministic proposed fixes", () => {
  it("creates an exact diff without changing the checked-in source", async () => {
    const repository = createDemoRepository();
    const issue = demoIssues.find((candidate) => candidate.id === "issue_img_alt");
    const before = await readDemoRepositoryFile("components/Hero.tsx");

    const fix = await generateProposedFix({
      repository,
      issues: [issue!],
      constraints: ["do not change visual design"],
    });
    const after = await readDemoRepositoryFile("components/Hero.tsx");

    expect(fix).toMatchObject({
      repositoryId: repository.id,
      issueIds: ["issue_img_alt"],
      status: "proposed",
      approvalStatus: "not_requested",
    });
    expect(fix.files).toHaveLength(1);
    expect(fix.files[0].diff).toContain('-          alt=""');
    expect(fix.files[0].diff).toContain('+          alt="Team reviewing a website audit"');
    expect(fix.files[0].proposed).toContain('alt="Team reviewing a website audit"');
    expect(after.content).toBe(before.content);
  });

  it("combines compatible issue fixes for the same file", async () => {
    const repository = createDemoRepository();
    const issues = demoIssues.filter((issue) =>
      ["issue_img_alt", "issue_hero_size"].includes(issue.id),
    );

    const fix = await generateProposedFix({
      repository,
      issues,
      constraints: ["do not change navigation"],
    });

    expect(fix.files).toHaveLength(1);
    expect(fix.files[0].path).toBe("components/Hero.tsx");
    expect(fix.files[0].proposed).toContain('src="/images/hero-640.webp"');
    expect(fix.files[0].proposed).toContain('alt="Team reviewing a website audit"');
    expect(fix.files[0].additions).toBe(4);
    expect(fix.files[0].deletions).toBe(2);
  });
});
