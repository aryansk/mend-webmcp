import type {
  ActivityEvent,
  AppliedFix,
  Audit,
  ProposedFix,
  VerificationResult,
} from "../types";
import type { RepositoryConnection } from "../repository/types";

const STORAGE_KEY = "mend.workspace.v1";

export type PersistedWorkspace = {
  version: 1;
  siteUrl: string;
  audit: Audit | null;
  selectedIssueId: string;
  repository: RepositoryConnection | null;
  activeFix: ProposedFix | null;
  appliedBranch: AppliedFix | null;
  verification: VerificationResult | null;
  activity: ActivityEvent[];
};

export function loadPersistedWorkspace(expectedSiteUrl: string) {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const value = JSON.parse(raw) as Partial<PersistedWorkspace>;

    if (
      value.version !== 1 ||
      typeof value.siteUrl !== "string" ||
      normalizeUrl(value.siteUrl) !== normalizeUrl(expectedSiteUrl) ||
      !Array.isArray(value.activity)
    ) {
      return null;
    }

    return value as PersistedWorkspace;
  } catch {
    return null;
  }
}

export function savePersistedWorkspace(workspace: PersistedWorkspace) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
  } catch {
    // Persistence is an enhancement. Private browsing or a full quota must not
    // prevent the repair workspace from continuing in memory.
  }
}

function normalizeUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString();
  } catch {
    return value;
  }
}
