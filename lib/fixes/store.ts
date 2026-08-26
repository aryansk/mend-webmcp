import type { ProposedFix } from "../types";

type FixStoreGlobal = typeof globalThis & {
  __mendFixStore?: Map<string, ProposedFix>;
};

const globalStore = globalThis as FixStoreGlobal;
const fixes = globalStore.__mendFixStore ?? new Map<string, ProposedFix>();

globalStore.__mendFixStore = fixes;

export function saveProposedFix(fix: ProposedFix) {
  fixes.set(fix.id, fix);
  return fix;
}

export function getProposedFix(fixId: string) {
  return fixes.get(fixId);
}

export function updateProposedFix(
  fixId: string,
  update: (fix: ProposedFix) => ProposedFix,
) {
  const current = fixes.get(fixId);

  if (!current) {
    return undefined;
  }

  const next = update(current);
  fixes.set(fixId, next);
  return next;
}

export function clearFixStore() {
  fixes.clear();
}
