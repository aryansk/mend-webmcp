import { demoAudit } from "../demo-data";
import { DEMO_REPOSITORY_ID } from "../repository/demo";
import { getRepository } from "../repository/store";
import type { FixApprovalStatus, ProposedFix } from "../types";
import { FixError } from "./errors";
import { decodeDemoFixIssueIds, generateProposedFix } from "./generator";
import {
  getProposedFix,
  saveProposedFix,
  updateProposedFix,
} from "./store";

export async function getFixOrRebuildDemo(fixId: string) {
  const stored = getProposedFix(fixId);

  if (stored) {
    return stored;
  }

  const issueIds = decodeDemoFixIssueIds(fixId);

  if (!issueIds) {
    return undefined;
  }

  const repository = getRepository(DEMO_REPOSITORY_ID);
  const issues = issueIds
    .map((issueId) => demoAudit.issues.find((issue) => issue.id === issueId))
    .filter((issue) => issue !== undefined);

  if (!repository || issues.length !== issueIds.length) {
    return undefined;
  }

  return generateProposedFix({
    id: fixId,
    repository,
    issues,
    constraints: [],
  });
}

export async function requestFixApproval(fixId: string) {
  const fix = await getFixOrRebuildDemo(fixId);

  if (!fix) {
    throw new FixError("The proposed fix was not found.", "fix_not_found", 404);
  }

  if (fix.approvalStatus === "approved") {
    return fix;
  }

  return saveProposedFix({
    ...fix,
    approvalStatus: "waiting_for_human",
    approvalRequestedAt: fix.approvalRequestedAt ?? new Date().toISOString(),
  });
}

export async function decideFix(
  fixId: string,
  decision: Extract<FixApprovalStatus, "approved" | "rejected">,
) {
  const fix = await getFixOrRebuildDemo(fixId);

  if (!fix) {
    throw new FixError("The proposed fix was not found.", "fix_not_found", 404);
  }

  if (fix.approvalStatus === decision) {
    return fix;
  }

  if (fix.approvalStatus !== "waiting_for_human") {
    throw new FixError(
      "Request human approval before recording a decision.",
      "approval_required",
      409,
    );
  }

  return updateProposedFix(fix.id, (current) => ({
    ...current,
    status: decision,
    approvalStatus: decision,
    decisionAt: new Date().toISOString(),
  })) as ProposedFix;
}

export function getFixSummary(fix: ProposedFix) {
  return {
    fixId: fix.id,
    repositoryId: fix.repositoryId,
    issueIds: fix.issueIds,
    status: fix.status,
    approvalStatus: fix.approvalStatus,
    filesChanged: fix.files.length,
    filePaths: fix.files.map((file) => file.path),
    requiresHumanApproval: true,
  };
}

export function getFixDiffPayload(fix: ProposedFix) {
  return {
    id: fix.id,
    fixId: fix.id,
    repositoryId: fix.repositoryId,
    issueIds: fix.issueIds,
    status: fix.status,
    approvalStatus: fix.approvalStatus,
    createdAt: fix.createdAt,
    approvalRequestedAt: fix.approvalRequestedAt,
    decisionAt: fix.decisionAt,
    applied: fix.applied,
    appliedAt: fix.appliedAt,
    explanation: fix.explanation,
    expectedImpact: fix.expectedImpact,
    constraints: fix.constraints,
    files: fix.files,
    requiresHumanApproval: true,
  };
}
