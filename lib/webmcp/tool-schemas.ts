import type { AuditCategory, Severity } from "../types";
import type { JsonSchema } from "./types";

export const MEND_TOOL_NAMES = [
  "scan_site",
  "get_audit_summary",
  "list_issues",
  "inspect_issue",
  "compare_audits",
  "get_repository_status",
  "list_repository_files",
  "inspect_source",
  "propose_fix",
  "get_fix_diff",
  "request_fix_approval",
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
  get_repository_status: {
    name: "get_repository_status",
    title: "Get connected repository status",
    description:
      "Check whether Mend has a connected source repository and return its public identity, branch, and file count before asking for source context.",
    inputSchema: {
      type: "object",
      properties: {
        repositoryId: {
          type: "string",
          description: "Optional repository identifier if one is already known.",
        },
      },
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      untrustedContentHint: true,
    },
  },
  list_repository_files: {
    name: "list_repository_files",
    title: "List connected source files",
    description:
      "List bounded source-file metadata from the connected repository when locating the file related to an audit issue.",
    inputSchema: {
      type: "object",
      properties: {
        repositoryId: {
          type: "string",
          description: "The connected repository identifier.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 50,
          default: 20,
          description: "Maximum number of file entries to return.",
        },
      },
      required: ["repositoryId"],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      untrustedContentHint: true,
    },
  },
  inspect_source: {
    name: "inspect_source",
    title: "Inspect mapped source",
    description:
      "Read the bounded source context mapped to one audit issue after a repository is connected; use this before proposing a patch.",
    inputSchema: {
      type: "object",
      properties: {
        repositoryId: {
          type: "string",
          description: "The connected repository identifier.",
        },
        issueId: {
          type: "string",
          description: "The audit issue whose mapped source should be read.",
        },
      },
      required: ["repositoryId", "issueId"],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      untrustedContentHint: true,
    },
  },
  propose_fix: {
    name: "propose_fix",
    title: "Propose a safe source fix",
    description:
      "Generate a bounded candidate patch for one or more mapped demo-repository issues without changing source; use this when the human is ready to review a concrete fix.",
    inputSchema: {
      type: "object",
      properties: {
        repositoryId: {
          type: "string",
          description: "The connected repository identifier.",
        },
        issueIds: {
          type: "array",
          items: { type: "string" },
          minItems: 1,
          maxItems: 6,
          description: "Mapped issue identifiers to include in the proposal.",
        },
        constraints: {
          type: "array",
          items: { type: "string" },
          maxItems: 4,
          description: "Optional safety constraints such as preserving navigation.",
        },
      },
      required: ["repositoryId", "issueIds"],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: false,
      untrustedContentHint: true,
    },
  },
  get_fix_diff: {
    name: "get_fix_diff",
    title: "Get proposed fix diff",
    description:
      "Read the exact original and proposed source diff for a Mend fix before asking the human to approve it; this tool never applies the patch.",
    inputSchema: {
      type: "object",
      properties: {
        fixId: {
          type: "string",
          description: "The proposal identifier returned by propose_fix.",
        },
      },
      required: ["fixId"],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      untrustedContentHint: true,
    },
  },
  request_fix_approval: {
    name: "request_fix_approval",
    title: "Request human fix approval",
    description:
      "Surface a proposed source patch in Mend and mark it as waiting for a human decision; this does not approve or apply the patch.",
    inputSchema: {
      type: "object",
      properties: {
        fixId: {
          type: "string",
          description: "The proposal identifier to surface for review.",
        },
      },
      required: ["fixId"],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: false,
      untrustedContentHint: true,
    },
  },
};
