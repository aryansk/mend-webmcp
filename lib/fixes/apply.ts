import { createHash } from "node:crypto";
import { readDemoRepositoryFile } from "../repository/files";
import { getRepository } from "../repository/store";
import type { AppliedFix, ProposedFix } from "../types";
import { FixError } from "./errors";
import { getFixOrRebuildDemo } from "./service";
import { saveProposedFix } from "./store";

type DemoBranchSnapshot = AppliedFix & {
  files: Map<string, string>;
};

type BranchStoreGlobal = typeof globalThis & {
  __mendDemoBranchStore?: Map<string, DemoBranchSnapshot>;
};

const globalStore = globalThis as BranchStoreGlobal;
const branches =
  globalStore.__mendDemoBranchStore ?? new Map<string, DemoBranchSnapshot>();

globalStore.__mendDemoBranchStore = branches;

export async function applyApprovedFix(fixId: string) {
  const existingBranch = branches.get(fixId);

  if (existingBranch) {
    const fix = await getFixOrRebuildDemo(fixId);
    const appliedFix = fix
      ? saveProposedFix({
          ...fix,
          status: fix.status === "verified" ? "verified" : "applied",
          approvalStatus: "approved",
          applied: toPublicBranch(existingBranch),
          appliedAt: fix.appliedAt ?? existingBranch.createdAt,
        })
      : undefined;

    return {
      branch: toPublicBranch(existingBranch),
      fix: appliedFix,
    };
  }

  const fix = await getFixOrRebuildDemo(fixId);

  if (!fix) {
    throw new FixError("The proposed fix was not found.", "fix_not_found", 404);
  }

  if (fix.approvalStatus !== "approved" || fix.status !== "approved") {
    throw new FixError(
      "A human must approve this fix before it can be applied.",
      "approval_required",
      409,
    );
  }

  const repository = getRepository(fix.repositoryId);

  if (!repository || repository.provider !== "demo") {
    throw new FixError(
      "Applying patches is currently enabled only for the controlled demo repository.",
      "provider_not_enabled",
      501,
    );
  }

  const branchFiles = new Map<string, string>();

  for (const file of fix.files) {
    const current = await readDemoRepositoryFile(file.path);

    if (current.content !== file.original) {
      throw new FixError(
        "The connected main source changed after this fix was proposed.",
        "source_changed",
        409,
      );
    }

    branchFiles.set(file.path, file.proposed);
  }

  const branchName = "mend/fix/" + fix.id;
  const commitSha = createCommitSha(branchName, fix.files);
  const branch: DemoBranchSnapshot = {
    fixId: fix.id,
    repositoryId: repository.id,
    branchName,
    baseBranch: repository.branch,
    commitSha,
    filesChanged: fix.files.length,
    filePaths: fix.files.map((file) => file.path),
    createdAt: new Date().toISOString(),
    pullRequestUrl: null,
    files: branchFiles,
  };

  branches.set(fix.id, branch);
  const applied = toPublicBranch(branch);
  const appliedFix = saveProposedFix({
    ...fix,
    status: "applied",
    applied,
    appliedAt: branch.createdAt,
  });

  return { branch: applied, fix: appliedFix };
}

export function getDemoBranch(fixId: string) {
  const branch = branches.get(fixId);

  return branch ? toPublicBranch(branch) : undefined;
}

export function clearDemoBranchStore() {
  branches.clear();
}

function toPublicBranch(branch: DemoBranchSnapshot): AppliedFix {
  const { files: _files, ...publicBranch } = branch;

  return publicBranch;
}

function createCommitSha(
  branchName: string,
  files: ProposedFix["files"],
) {
  const payload = files
    .map((file) => file.path + "\u0000" + file.proposed)
    .join("\u0000");

  return createHash("sha1")
    .update(branchName + "\u0000" + payload)
    .digest("hex");
}
