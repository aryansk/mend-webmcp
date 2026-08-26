import type { Audit } from "../types";

type AuditStoreGlobal = typeof globalThis & {
  __mendAuditStore?: Map<string, Audit>;
};

const globalStore = globalThis as AuditStoreGlobal;
const audits = globalStore.__mendAuditStore ?? new Map<string, Audit>();

globalStore.__mendAuditStore = audits;

export function saveAudit(audit: Audit) {
  audits.set(audit.id, audit);
  return audit;
}

export function getAudit(auditId: string) {
  return audits.get(auditId);
}

export function getLatestAudit(siteUrl: string) {
  return Array.from(audits.values())
    .filter((audit) => audit.siteUrl === siteUrl)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
}
