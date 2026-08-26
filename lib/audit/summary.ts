import type { Audit, Issue, Severity } from "../types";

export function countHighImpactIssues(issues: Issue[]): number {
  return issues.filter(
    (issue) => issue.severity === "critical" || issue.severity === "high",
  ).length;
}

export function countIssuesBySeverity(
  issues: Issue[],
  severity: Severity,
): number {
  return issues.filter((issue) => issue.severity === severity).length;
}

export function getAuditSummary(audit: Audit) {
  return {
    auditId: audit.id,
    siteUrl: audit.siteUrl,
    issueCount: audit.issues.length,
    highImpactIssueCount: countHighImpactIssues(audit.issues),
    scores: audit.scores,
    brokenLinks: audit.brokenLinks,
  };
}
