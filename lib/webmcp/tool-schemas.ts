import type { AuditCategory, Severity } from "../types";
import type { JsonSchema } from "./types";

export const MEND_TOOL_NAMES = [
  "scan_site",
  "get_audit_summary",
  "list_issues",
  "inspect_issue",
  "compare_audits",
] as const;

export type MendToolName = (typeof MEND_TOOL_NAMES)[number];

const categories: AuditCategory[] = [
  "accessibility",
  "performance",
  "seo",
  "link",
];

const severities: Severity[] = ["critical", "high", "medium", "low"];

const categorySchema: JsonSchema = {
  type: "string",
  enum: categories,
};

const severitySchema: JsonSchema = {
  type: "string",
  enum: severities,
};

export type MendToolMetadata = {
  name: MendToolName;
  title: string;
  description: string;
  inputSchema: JsonSchema;
  annotations: {
    readOnlyHint: boolean;
    untrustedContentHint: true;
  };
};

export const MEND_TOOL_METADATA: Record<MendToolName, MendToolMetadata> = {
  scan_site: {
    name: "scan_site",
    title: "Scan a website",
    description:
      "Run a bounded Mend audit for a public website when you need fresh accessibility, performance, SEO, or link findings. This creates an audit record but never changes the target site.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "Public HTTPS URL to scan.",
        },
        categories: {
          type: "array",
          items: categorySchema,
          minItems: 1,
          maxItems: 4,
          description: "Optional audit categories to run.",
        },
      },
      required: ["url"],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: false,
      untrustedContentHint: true,
    },
  },
  get_audit_summary: {
    name: "get_audit_summary",
    title: "Get an audit summary",
    description:
      "Retrieve compact scores and high-impact counts for a completed Mend audit when you need the current state without loading every issue.",
    inputSchema: {
      type: "object",
      properties: {
        auditId: {
          type: "string",
          description: "The audit identifier returned by scan_site.",
        },
      },
      required: ["auditId"],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      untrustedContentHint: true,
    },
  },
  list_issues: {
    name: "list_issues",
    title: "List audit issues",
    description:
      "List prioritized issues from a completed audit, optionally filtered by category and severity, when deciding what to inspect or repair next.",
    inputSchema: {
      type: "object",
      properties: {
        auditId: {
          type: "string",
          description: "The audit identifier to inspect.",
        },
        category: {
          ...categorySchema,
          description: "Optional category filter.",
        },
        severity: {
          type: "array",
          items: severitySchema,
          maxItems: 4,
          description: "Optional severity filters.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 50,
          default: 20,
          description: "Maximum number of issues to return.",
        },
      },
      required: ["auditId"],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      untrustedContentHint: true,
    },
  },
  inspect_issue: {
    name: "inspect_issue",
    title: "Inspect an audit issue",
    description:
      "Retrieve the evidence, affected element, impact, and source hint for one Mend issue before proposing a fix.",
    inputSchema: {
      type: "object",
      properties: {
        issueId: {
          type: "string",
          description: "The issue identifier returned by list_issues.",
        },
      },
      required: ["issueId"],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      untrustedContentHint: true,
    },
  },
  compare_audits: {
    name: "compare_audits",
    title: "Compare two audits",
    description:
      "Compare a before and after Mend audit to see score deltas, resolved issues, remaining issues, and regressions after a change or deployment.",
    inputSchema: {
      type: "object",
      properties: {
        beforeAuditId: {
          type: "string",
          description: "The earlier audit identifier.",
        },
        afterAuditId: {
          type: "string",
          description: "The later audit identifier.",
        },
      },
      required: ["beforeAuditId", "afterAuditId"],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      untrustedContentHint: true,
    },
  },
};
