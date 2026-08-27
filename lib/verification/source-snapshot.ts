import type { Audit, Issue, ScoreKey, Severity } from "../types";
import { readDemoBranchFile } from "../fixes/apply";

const scoreDeductions: Record<Severity, number> = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
};

const issueChecks: Record<string, (source: string) => boolean> = {
  issue_img_alt: (source) => /<img[\s\S]*?alt\s*=\s*""/.test(source),
  issue_form_label: (source) => {
    const input = source.match(/<input[\s\S]*?\/>/)?.[0] ?? "";
    const hasAccessibleName =
      /aria-label\s*=\s*"[^"]+"/.test(input) ||
      /aria-labelledby\s*=\s*"[^"]+"/.test(input);
    const hasExplicitLabel = /<label[^>]*htmlFor\s*=\s*"email"/.test(source);

    return !hasAccessibleName && !hasExplicitLabel;
  },
  issue_hero_size: (source) =>
    !/src\s*=\s*"\/images\/hero-640\.webp"/.test(source) ||
    !/width\s*=\s*\{640\}/.test(source) ||
    !/height\s*=\s*\{420\}/.test(source),
  issue_heading_order: (source) => /<h3>Human approval<\/h3>/.test(source),
  issue_blocking_script: (source) =>
    /<script\s+src="\/analytics\.js"><\/script>/.test(source),
  issue_meta_description: (source) =>
    !/description\s*:\s*"[^"]+"/.test(source),
};

export async function verifySourceSnapshot(input: {
  before: Audit;
  fixId: string;
  afterAuditId: string;
  previewUrl: string | null;
}) {
  const sourceCache = new Map<string, string>();
  const remainingIssues: Issue[] = [];

  for (const issue of input.before.issues) {
    const check = issueChecks[issue.id];
    const filePath = issue.sourceHint?.filePath;

    if (!check || !filePath) {
      remainingIssues.push({ ...issue, auditId: input.afterAuditId });
      continue;
    }

    let source = sourceCache.get(filePath);

    if (source === undefined) {
      source = await readDemoBranchFile(input.fixId, filePath);
      sourceCache.set(filePath, source);
    }

    if (check(source)) {
      remainingIssues.push({ ...issue, auditId: input.afterAuditId });
    }
  }

  const after: Audit = {
    ...input.before,
    id: input.afterAuditId,
    siteUrl: input.previewUrl ?? input.before.siteUrl,
    createdAt: new Date().toISOString(),
    scores: calculateScores(input.before, remainingIssues),
    issues: remainingIssues,
  };

  return {
    after,
    inspectedFiles: Array.from(sourceCache.keys()).sort(),
  };
}

function calculateScores(before: Audit, remainingIssues: Issue[]) {
  const remainingIds = new Set(remainingIssues.map((issue) => issue.id));
  const scores = { ...before.scores };

  for (const issue of before.issues) {
    if (remainingIds.has(issue.id) || issue.category === "link") {
      continue;
    }

    const key = issue.category as ScoreKey;
    const current = scores[key];

    if (current !== undefined) {
      scores[key] = Math.min(100, current + scoreDeductions[issue.severity]);
    }
  }

  return scores;
}
