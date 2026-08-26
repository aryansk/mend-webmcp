import type { Audit, AuditCategory, Issue, Severity } from "../types";
import { asRecord, isAbortError, requestMendApi } from "./api";
import {
  MEND_TOOL_METADATA,
  type MendToolName,
} from "./tool-schemas";
import type { WebMcpExecuteContext, WebMcpTool } from "./types";

const auditCategories: AuditCategory[] = [
  "accessibility",
  "performance",
  "seo",
  "link",
];

const issueSeverities: Severity[] = ["critical", "high", "medium", "low"];

export type MendToolCallbacks = {
  onAudit: (audit: Audit) => void;
};

export function createMendTools(callbacks: MendToolCallbacks): WebMcpTool[] {
  return [
    {
      ...MEND_TOOL_METADATA.scan_site,
      execute: (input, context) =>
        safelyExecute(context, async () => {
          const values = readRecord(input);
          const url = readRequiredString(values, "url");
          const categories = readCategories(values.categories);
          const payload = asRecord(
            await requestMendApi("/api/audits", {
              body: JSON.stringify({ url, categories }),
              method: "POST",
              signal: context.signal,
            }),
          );
          const audit = readAudit(payload);

          callbacks.onAudit(audit);

          return {
            auditId: audit.id,
            siteUrl: audit.siteUrl,
            scores: audit.scores,
            issueCount: audit.issues.length,
            highImpactIssueCount: audit.issues.filter(
              (issue) => issue.severity === "critical" || issue.severity === "high",
            ).length,
          };
        }),
    },
    {
      ...MEND_TOOL_METADATA.get_audit_summary,
      execute: (input, context) =>
        safelyExecute(context, async () => {
          const values = readRecord(input);
          const auditId = readRequiredString(values, "auditId");
          const payload = asRecord(
            await requestMendApi(
              "/api/audits?auditId=" + encodeURIComponent(auditId),
              { signal: context.signal },
            ),
          );

          return readSummary(payload);
        }),
    },
    {
      ...MEND_TOOL_METADATA.list_issues,
      execute: (input, context) =>
        safelyExecute(context, async () => {
          const values = readRecord(input);
          const auditId = readRequiredString(values, "auditId");
          const category = readCategory(values.category);
          const severities = readSeverityArray(values.severity);
          const limit = readLimit(values.limit);
          const payload = asRecord(
            await requestMendApi(
              "/api/audits?auditId=" + encodeURIComponent(auditId),
              { signal: context.signal },
            ),
          );
          const audit = readAudit(payload);
          const filteredIssues = audit.issues.filter((issue) => {
            if (category && issue.category !== category) {
              return false;
            }

            return severities.length === 0 || severities.includes(issue.severity);
          });
          const issues = filteredIssues.slice(0, limit).map(toCompactIssue);

          return {
            auditId: audit.id,
            total: filteredIssues.length,
            returned: issues.length,
            issues,
          };
        }),
    },
    {
      ...MEND_TOOL_METADATA.inspect_issue,
      execute: (input, context) =>
        safelyExecute(context, async () => {
          const values = readRecord(input);
          const issueId = readRequiredString(values, "issueId");
          const payload = asRecord(
            await requestMendApi(
              "/api/audits?issueId=" + encodeURIComponent(issueId),
              { signal: context.signal },
            ),
          );
          const issue = readIssue(payload);

          return {
            issue,
            evidence: issue.evidence ?? null,
            sourceHints: issue.sourceHint ? [issue.sourceHint] : [],
          };
        }),
    },
    {
      ...MEND_TOOL_METADATA.compare_audits,
      execute: (input, context) =>
        safelyExecute(context, async () => {
          const values = readRecord(input);
          const beforeAuditId = readRequiredString(values, "beforeAuditId");
          const afterAuditId = readRequiredString(values, "afterAuditId");
          const query =
            "/api/audits?beforeAuditId=" +
            encodeURIComponent(beforeAuditId) +
            "&afterAuditId=" +
            encodeURIComponent(afterAuditId);
          const payload = asRecord(
            await requestMendApi(query, { signal: context.signal }),
          );

          return payload.comparison ?? {
            ok: false,
            error: "The audit service returned no comparison.",
            code: "invalid_response",
          };
        }),
    },
  ];
}

export function getToolNames(tools: WebMcpTool[]) {
  return tools.map((tool) => tool.name as MendToolName);
}

function safelyExecute(
  context: WebMcpExecuteContext,
  operation: () => Promise<unknown>,
) {
  return operation().catch((error: unknown) => {
    if (context.signal.aborted || isAbortError(error)) {
      return {
        ok: false,
        error: "Tool execution was cancelled.",
        code: "aborted",
      };
    }

    const record = error as { code?: unknown; message?: unknown };

    return {
      ok: false,
      error:
        typeof record.message === "string"
          ? record.message
          : "The WebMCP tool could not complete.",
      code: typeof record.code === "string" ? record.code : "tool_failed",
    };
  });
}

function readRecord(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Tool input must be a JSON object.");
  }

  return input as Record<string, unknown>;
}

function readRequiredString(values: Record<string, unknown>, key: string) {
  const value = values[key];

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(key + " is required.");
  }

  return value.trim();
}

function readCategories(value: unknown): AuditCategory[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((item) => !auditCategories.includes(item as AuditCategory))
  ) {
    throw new Error("categories must contain valid Mend audit categories.");
  }

  return Array.from(new Set(value)) as AuditCategory[];
}

function readCategory(value: unknown): AuditCategory | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!auditCategories.includes(value as AuditCategory)) {
    throw new Error("category must be a valid Mend audit category.");
  }

  return value as AuditCategory;
}

function readSeverityArray(value: unknown): Severity[] {
  if (value === undefined) {
    return [];
  }

  if (
    !Array.isArray(value) ||
    value.some((item) => !issueSeverities.includes(item as Severity))
  ) {
    throw new Error("severity must contain valid Mend severity values.");
  }

  return Array.from(new Set(value)) as Severity[];
}

function readLimit(value: unknown) {
  if (value === undefined) {
    return 20;
  }

  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error("limit must be an integer.");
  }

  return Math.min(50, Math.max(1, value));
}

function readAudit(payload: Record<string, unknown>): Audit {
  if (!payload.audit || typeof payload.audit !== "object") {
    throw new Error("The audit service returned no audit.");
  }

  return payload.audit as Audit;
}

function readSummary(payload: Record<string, unknown>) {
  if (!payload.summary || typeof payload.summary !== "object") {
    throw new Error("The audit service returned no summary.");
  }

  return payload.summary;
}

function readIssue(payload: Record<string, unknown>): Issue {
  if (!payload.issue || typeof payload.issue !== "object") {
    throw new Error("The audit service returned no issue.");
  }

  return payload.issue as Issue;
}

function toCompactIssue(issue: Issue) {
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
