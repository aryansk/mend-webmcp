import { describe, expect, it } from "vitest";
import {
  MEND_TOOL_METADATA,
  MEND_TOOL_NAMES,
} from "../../lib/webmcp/tool-schemas";

describe("WebMCP tool contract", () => {
  it("keeps the exposed tool names unique and metadata complete", () => {
    expect(new Set(MEND_TOOL_NAMES).size).toBe(MEND_TOOL_NAMES.length);

    for (const name of MEND_TOOL_NAMES) {
      const metadata = MEND_TOOL_METADATA[name];

      expect(metadata.name).toBe(name);
      expect(metadata.description.length).toBeGreaterThan(40);
      expect(metadata.inputSchema.type).toBe("object");
      expect(metadata.inputSchema.additionalProperties).toBe(false);
      expect(metadata.annotations.untrustedContentHint).toBe(true);
    }
  });

  it("marks only read-only tools as read-only", () => {
    const readOnlyTools = MEND_TOOL_NAMES.filter(
      (name) => MEND_TOOL_METADATA[name].annotations.readOnlyHint,
    );
    const mutatingTools = MEND_TOOL_NAMES.filter(
      (name) => !MEND_TOOL_METADATA[name].annotations.readOnlyHint,
    );

    expect(readOnlyTools).toEqual([
      "get_audit_summary",
      "list_issues",
      "inspect_issue",
      "compare_audits",
      "get_repository_status",
      "list_repository_files",
      "inspect_source",
      "get_fix_diff",
    ]);
    expect(mutatingTools).toEqual([
      "scan_site",
      "propose_fix",
      "request_fix_approval",
      "apply_approved_fix",
      "verify_fix",
    ]);
  });
});
