import { describe, expect, it } from "vitest";
import { demoAudit, demoIssues } from "../../lib/demo-data";
import {
  countHighImpactIssues,
  countIssuesBySeverity,
  getAuditSummary,
} from "../../lib/audit/summary";

describe("audit summary helpers", () => {
  it("counts critical and high issues as high impact", () => {
    expect(countHighImpactIssues(demoIssues)).toBe(3);
  });

  it("counts a requested severity exactly", () => {
    expect(countIssuesBySeverity(demoIssues, "medium")).toBe(2);
  });

  it("returns a compact agent-friendly summary", () => {
    expect(getAuditSummary(demoAudit)).toMatchObject({
      auditId: "audit_demo_001",
      issueCount: 6,
      highImpactIssueCount: 3,
      brokenLinks: 3,
    });
  });
});
