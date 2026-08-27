import { demoAudit } from "../demo-data";
import { compareAudits } from "../audit/compare";
import { getAudit, getAuditForIssue, saveAudit } from "../audit/store";
import { getRepository } from "../repository/store";
import type { Audit, ProposedFix, VerificationResult } from "../types";
import { FixError } from "../fixes/errors";
import { getFixOrRebuildDemo } from "../fixes/service";
import { saveProposedFix } from "../fixes/store";
import { verifySourceSnapshot } from "./source-snapshot";

type VerificationStoreGlobal = typeof globalThis & {
  __mendVerificationStore?: Map<string, VerificationResult>;
};

const globalStore = globalThis as VerificationStoreGlobal;
const verifications =
  globalStore.__mendVerificationStore ?? new Map<string, VerificationResult>();

globalStore.__mendVerificationStore = verifications;

export async function verifyFix(fixId: string, previewInput?: unknown) {
  const existingVerification = verifications.get(fixId);
  const fix = await getFixOrRebuildDemo(fixId);

  if (existingVerification) {
    return {
      verification: existingVerification,
      fix,
      beforeAudit: getAudit(existingVerification.beforeAuditId),
      afterAudit: getAudit(existingVerification.afterAuditId),
    };
  }

  if (!fix) {
    throw new FixError("The proposed fix was not found.", "fix_not_found", 404);
  }

  if (fix.verification) {
    verifications.set(fixId, fix.verification);

    return {
      verification: fix.verification,
      fix,
      beforeAudit: getAudit(fix.verification.beforeAuditId),
      afterAudit: getAudit(fix.verification.afterAuditId),
    };
  }

  if (fix.status !== "applied" || !fix.applied) {
    throw new FixError(
      "Apply the approved fix to a branch before verifying it.",
      "fix_not_applied",
      409,
    );
  }

  const repository = getRepository(fix.repositoryId);

  if (!repository || repository.provider !== "demo") {
    throw new FixError(
      "Verification is currently enabled only for the controlled demo repository.",
      "provider_not_enabled",
      501,
    );
  }

  const previewUrl = normalizePreviewUrl(previewInput);
  const before = getBeforeAudit(fix);
  const afterId = "audit_verify_after_" + fix.id;
  const snapshot = await verifySourceSnapshot({
    before,
    fixId,
    afterAuditId: afterId,
    previewUrl,
  });
  const after = snapshot.after;

  saveAudit(before);
  saveAudit(after);

  const comparison = compareAudits(before, after);
  const verified = fix.issueIds.every((issueId) =>
    comparison.resolvedIssueIds.includes(issueId),
  ) && comparison.regressions.length === 0;
  const verifiedAt = new Date().toISOString();
  const verification: VerificationResult = {
    id: "verification_" + fix.id,
    fixId: fix.id,
    repositoryId: repository.id,
    branchName: fix.applied.branchName,
    mode: "source_snapshot",
    previewUrl,
    verified,
    verifiedAt,
    beforeAuditId: comparison.beforeAuditId,
    afterAuditId: comparison.afterAuditId,
    before: comparison.before,
    after: comparison.after,
    scoreDelta: comparison.scoreDelta,
    brokenLinksDelta: comparison.brokenLinksDelta,
    resolvedIssueIds: comparison.resolvedIssueIds,
    remainingIssueIds: comparison.remainingIssueIds,
    regressions: comparison.regressions,
    checks: createChecks(fix, comparison, verified, snapshot.inspectedFiles),
  };

  verifications.set(fix.id, verification);
  const nextFix: ProposedFix = saveProposedFix({
    ...fix,
    status: verified ? "verified" : "applied",
    verification,
    verifiedAt,
  });

  return { verification, fix: nextFix, beforeAudit: before, afterAudit: after };
}

export function getVerification(fixId: string) {
  return verifications.get(fixId);
}

export function clearVerificationStore() {
  verifications.clear();
}

function getBeforeAudit(fix: ProposedFix): Audit {
  const storedAudit = getAuditForIssue(fix.issueIds[0]);

  if (storedAudit) {
    return storedAudit;
  }

  return {
    ...demoAudit,
    id: "audit_verify_before_" + fix.id,
    createdAt: new Date().toISOString(),
    issues: demoAudit.issues.map((issue) => ({ ...issue })),
  };
}

function createChecks(
  fix: ProposedFix,
  comparison: ReturnType<typeof compareAudits>,
  verified: boolean,
  inspectedFiles: string[],
): VerificationResult["checks"] {
  const resolvedTargets = fix.issueIds.filter((issueId) =>
    comparison.resolvedIssueIds.includes(issueId),
  );

  return [
    {
      label: "Patched source",
      status: inspectedFiles.length > 0 ? "passed" : "warning",
      detail:
        inspectedFiles.length > 0
          ? "Re-ran deterministic checks against " + inspectedFiles.join(", ") + "."
          : "No mapped source file was available for verification.",
    },
    {
      label: "Target issues",
      status: resolvedTargets.length === fix.issueIds.length ? "passed" : "warning",
      detail:
        resolvedTargets.length +
        " of " +
        fix.issueIds.length +
        " targeted issue" +
        (fix.issueIds.length === 1 ? "" : "s") +
        " resolved.",
    },
    {
      label: "Regressions",
      status: comparison.regressions.length === 0 ? "passed" : "warning",
      detail:
        comparison.regressions.length === 0
          ? "No new normalized findings appeared in the branch snapshot."
          : comparison.regressions.length + " new finding(s) need review.",
    },
    {
      label: "Verification result",
      status: verified ? "passed" : "warning",
      detail: verified
        ? "The approved branch snapshot passed the controlled verification replay."
        : "The branch snapshot needs another review before release.",
    },
  ];
}

function normalizePreviewUrl(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string" || value.trim() === "") {
    throw new FixError(
      "previewUrl must be an absolute http(s) URL when provided.",
      "invalid_preview_url",
      400,
    );
  }

  let url: URL;

  try {
    url = new URL(value.trim());
  } catch {
    throw new FixError(
      "previewUrl must be an absolute http(s) URL when provided.",
      "invalid_preview_url",
      400,
    );
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new FixError(
      "previewUrl must be an absolute http(s) URL without credentials.",
      "invalid_preview_url",
      400,
    );
  }

  url.hash = "";
  return url.toString();
}
