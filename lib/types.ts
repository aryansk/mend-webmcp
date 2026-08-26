export type AuditCategory =
  | "accessibility"
  | "performance"
  | "seo"
  | "link";

export type Severity = "critical" | "high" | "medium" | "low";

export type ScoreKey = "performance" | "accessibility" | "seo";

export type SourceHint = {
  repo?: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  confidence: number;
  reason?: string;
};

export type Issue = {
  id: string;
  auditId: string;
  category: AuditCategory;
  severity: Severity;
  title: string;
  description: string;
  pageUrl: string;
  selector?: string;
  sourceHint?: SourceHint;
  evidence?: string;
  estimatedImpact?: string;
};

export type Audit = {
  id: string;
  siteUrl: string;
  createdAt: string;
  scores: Partial<Record<ScoreKey, number>>;
  brokenLinks: number;
  issues: Issue[];
  finalUrl?: string;
  responseBytes?: number;
  responseTimeMs?: number;
  checkedLinks?: number;
};

export type FilePatch = {
  path: string;
  original: string;
  proposed: string;
  diff: string;
  additions: number;
  deletions: number;
};

export type FixApprovalStatus =
  | "not_requested"
  | "waiting_for_human"
  | "approved"
  | "rejected";

export type AppliedFix = {
  fixId: string;
  repositoryId: string;
  branchName: string;
  baseBranch: string;
  commitSha: string;
  filesChanged: number;
  filePaths: string[];
  createdAt: string;
  pullRequestUrl: string | null;
};

export type ProposedFix = {
  id: string;
  repositoryId: string;
  issueIds: string[];
  files: FilePatch[];
  explanation: string;
  expectedImpact: string[];
  constraints: string[];
  createdAt: string;
  status: "proposed" | "approved" | "rejected" | "applied" | "verified";
  approvalStatus: FixApprovalStatus;
  approvalRequestedAt?: string;
  decisionAt?: string;
  applied?: AppliedFix;
  appliedAt?: string;
};

export type ActivityEvent = {
  id: string;
  label: string;
  detail: string;
  tone: "neutral" | "success" | "warning";
  time: string;
};
