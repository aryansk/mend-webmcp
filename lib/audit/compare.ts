import type { Audit, Issue, ScoreKey } from "../types";

export type CompactIssue = Pick<
  Issue,
  "id" | "category" | "severity" | "title" | "pageUrl" | "selector" | "sourceHint"
>;

export type AuditComparison = {
  beforeAuditId: string;
  afterAuditId: string;
  siteUrl: string;
  before: {
    scores: Audit["scores"];
    brokenLinks: number;
    issueCount: number;
  };
  after: {
    scores: Audit["scores"];
    brokenLinks: number;
    issueCount: number;
  };
  scoreDelta: Partial<Record<ScoreKey, number>>;
  brokenLinksDelta: number;
  resolvedIssueIds: string[];
  remainingIssueIds: string[];
  regressions: CompactIssue[];
};

export function compareAudits(before: Audit, after: Audit): AuditComparison {
  const beforeKeys = new Set(before.issues.map(issueFingerprint));
  const afterKeys = new Set(after.issues.map(issueFingerprint));

  return {
    beforeAuditId: before.id,
    afterAuditId: after.id,
    siteUrl: after.siteUrl,
    before: auditSnapshot(before),
    after: auditSnapshot(after),
    scoreDelta: getScoreDelta(before, after),
    brokenLinksDelta: after.brokenLinks - before.brokenLinks,
    resolvedIssueIds: before.issues
      .filter((issue) => !afterKeys.has(issueFingerprint(issue)))
      .map((issue) => issue.id),
    remainingIssueIds: after.issues
      .filter((issue) => beforeKeys.has(issueFingerprint(issue)))
      .map((issue) => issue.id),
    regressions: after.issues
      .filter((issue) => !beforeKeys.has(issueFingerprint(issue)))
      .map(toCompactIssue),
  };
}

export function toCompactIssue(issue: Issue): CompactIssue {
  return {
    id: issue.id,
    category: issue.category,
    severity: issue.severity,
    title: issue.title,
    pageUrl: issue.pageUrl,
    selector: issue.selector,
    sourceHint: issue.sourceHint,
  };
}

function auditSnapshot(audit: Audit) {
  return {
    scores: audit.scores,
    brokenLinks: audit.brokenLinks,
    issueCount: audit.issues.length,
  };
}

function getScoreDelta(before: Audit, after: Audit) {
  const delta: Partial<Record<ScoreKey, number>> = {};

  for (const key of ["performance", "accessibility", "seo"] as ScoreKey[]) {
    const beforeScore = before.scores[key];
    const afterScore = after.scores[key];

    if (beforeScore !== undefined && afterScore !== undefined) {
      delta[key] = afterScore - beforeScore;
    }
  }

  return delta;
}

function issueFingerprint(issue: Issue) {
  return [issue.category, issue.title, issue.pageUrl, issue.selector ?? ""]
    .map((part) => part.trim().toLowerCase())
    .join("|");
}
