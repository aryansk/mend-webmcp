import { afterEach, describe, expect, it, vi } from "vitest";
import { demoAudit } from "../../lib/demo-data";
import {
  clearAuditCache,
  createMendTools,
} from "../../lib/webmcp/tools";
import {
  MEND_TOOL_METADATA,
  MEND_TOOL_NAMES,
} from "../../lib/webmcp/tool-schemas";
import { registerMendTools } from "../../lib/webmcp/register-tools";

const toolContext = {
  signal: new AbortController().signal,
};

afterEach(() => {
  clearAuditCache();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Mend WebMCP tools", () => {
  it("exposes five coherent schemas with explicit read-only hints", () => {
    expect(Object.keys(MEND_TOOL_METADATA)).toEqual([...MEND_TOOL_NAMES]);
    expect(MEND_TOOL_METADATA.scan_site.annotations.readOnlyHint).toBe(false);

    for (const toolName of MEND_TOOL_NAMES) {
      const metadata = MEND_TOOL_METADATA[toolName];
      expect(metadata.inputSchema.type).toBe("object");
      expect(metadata.inputSchema.required?.length).toBeGreaterThan(0);
      expect(metadata.description.length).toBeGreaterThan(40);
    }

    expect(MEND_TOOL_METADATA.get_audit_summary.annotations.readOnlyHint).toBe(
      true,
    );
    expect(MEND_TOOL_METADATA.list_issues.annotations.readOnlyHint).toBe(true);
    expect(MEND_TOOL_METADATA.inspect_issue.annotations.readOnlyHint).toBe(true);
    expect(MEND_TOOL_METADATA.compare_audits.annotations.readOnlyHint).toBe(true);
  });

  it("returns a compact scan result and synchronizes the UI callback", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        audit: demoAudit,
        summary: {
          auditId: demoAudit.id,
          issueCount: demoAudit.issues.length,
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const onAudit = vi.fn();
    const scanTool = createMendTools({ onAudit }).find(
      (tool) => tool.name === "scan_site",
    );

    const result = await scanTool?.execute(
      {
        url: demoAudit.siteUrl,
        categories: ["accessibility", "performance"],
      },
      toolContext,
    );

    expect(result).toMatchObject({
      auditId: demoAudit.id,
      issueCount: 6,
      highImpactIssueCount: 3,
    });
    expect(result).not.toHaveProperty("issues");
    expect(onAudit).toHaveBeenCalledWith(demoAudit);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/audits",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("filters list_issues and reports invalid input without throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ audit: demoAudit })),
    );
    const listTool = createMendTools({ onAudit: vi.fn() }).find(
      (tool) => tool.name === "list_issues",
    );

    const result = await listTool?.execute(
      {
        auditId: demoAudit.id,
        category: "accessibility",
        severity: ["high"],
        limit: 1,
      },
      toolContext,
    );
    const invalidResult = await listTool?.execute(
      { auditId: demoAudit.id, severity: ["urgent"] },
      toolContext,
    );

    expect(result).toMatchObject({ auditId: demoAudit.id, total: 2, returned: 1 });
    expect(result).toHaveProperty("issues.0.category", "accessibility");
    expect(result).toHaveProperty("issues.0.severity", "high");
    expect(invalidResult).toMatchObject({ ok: false, code: "tool_failed" });
    expect(invalidResult).toHaveProperty(
      "error",
      "severity must contain valid Mend severity values.",
    );
  });

  it("keeps a bounded same-page audit chain available across tool calls", async () => {
    const before = { ...demoAudit, id: "audit_cache_before" };
    const after = {
      ...demoAudit,
      id: "audit_cache_after",
      scores: { performance: 91, accessibility: 98, seo: 94 },
      brokenLinks: 0,
      issues: demoAudit.issues.slice(1),
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ audit: before }))
      .mockResolvedValueOnce(Response.json({ audit: after }));
    vi.stubGlobal("fetch", fetchMock);
    const tools = createMendTools({ onAudit: vi.fn() });
    const scanTool = tools.find((tool) => tool.name === "scan_site");
    const summaryTool = tools.find((tool) => tool.name === "get_audit_summary");
    const inspectTool = tools.find((tool) => tool.name === "inspect_issue");
    const compareTool = tools.find((tool) => tool.name === "compare_audits");

    await scanTool?.execute({ url: before.siteUrl }, toolContext);
    await scanTool?.execute({ url: after.siteUrl }, toolContext);
    const summary = await summaryTool?.execute(
      { auditId: before.id },
      toolContext,
    );
    const inspection = await inspectTool?.execute(
      { issueId: "issue_img_alt" },
      toolContext,
    );
    const comparison = await compareTool?.execute(
      { beforeAuditId: before.id, afterAuditId: after.id },
      toolContext,
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(summary).toMatchObject({ auditId: before.id, issueCount: 6 });
    expect(inspection).toHaveProperty("issue.id", "issue_img_alt");
    expect(comparison).toMatchObject({ scoreDelta: { performance: 30 } });
  });

  it("registers every tool and aborts the registration signal on cleanup", async () => {
    const registerTool = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("document", {
      modelContext: { registerTool },
    });
    const onStatus = vi.fn();

    const cleanup = registerMendTools({
      onAudit: vi.fn(),
      onStatus,
    });

    await vi.waitFor(() => {
      expect(onStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          state: "ready",
          registeredTools: [...MEND_TOOL_NAMES],
        }),
      );
    });
    expect(registerTool).toHaveBeenCalledTimes(5);
    expect(registerTool.mock.calls[0][1].signal.aborted).toBe(false);

    cleanup();

    expect(registerTool.mock.calls[0][1].signal.aborted).toBe(true);
  });
});
