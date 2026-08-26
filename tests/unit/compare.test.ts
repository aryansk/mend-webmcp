import { describe, expect, it } from "vitest";
import { compareAudits } from "../../lib/audit/compare";
import { demoAudit, demoIssues } from "../../lib/demo-data";

describe("audit comparisons", () => {
  it("matches issues by finding identity and reports score changes", () => {
    const before = {
      ...demoAudit,
      id: "audit_before_unit",
    };
    const after = {
      ...demoAudit,
      id: "audit_after_unit",
      scores: {
        performance: 91,
        accessibility: 98,
        seo: 94,
      },
      brokenLinks: 0,
      issues: demoIssues.filter((issue) => issue.id !== "issue_img_alt"),
    };

    const comparison = compareAudits(before, after);

    expect(comparison.scoreDelta).toEqual({
      performance: 30,
      accessibility: 24,
      seo: 12,
    });
    expect(comparison.brokenLinksDelta).toBe(-3);
    expect(comparison.resolvedIssueIds).toContain("issue_img_alt");
    expect(comparison.remainingIssueIds).toContain("issue_form_label");
    expect(comparison.regressions).toEqual([]);
  });
});
