import { afterEach, describe, expect, it, vi } from "vitest";
import { demoAudit } from "../../lib/demo-data";
import {
  clearAuditCache,
  clearFixCache,
  cacheRepositorySnapshot,
  clearRepositoryCache,
  createMendTools,
} from "../../lib/webmcp/tools";
import {
  MEND_TOOL_METADATA,
  MEND_TOOL_NAMES,
} from "../../lib/webmcp/tool-schemas";
import { registerMendTools } from "../../lib/webmcp/register-tools";
import { createDemoRepository } from "../../lib/repository/demo";
import { listDemoRepositoryFiles } from "../../lib/repository/files";

const toolContext = {
  signal: new AbortController().signal,
};

afterEach(() => {
  clearAuditCache();
  clearFixCache();
  clearRepositoryCache();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Mend WebMCP tools", () => {
  it("exposes coherent schemas with explicit read-only hints", () => {
    expect(Object.keys(MEND_TOOL_METADATA)).toEqual([...MEND_TOOL_NAMES]);
    expect(MEND_TOOL_METADATA.scan_site.annotations.readOnlyHint).toBe(false);

    for (const toolName of MEND_TOOL_NAMES) {
      const metadata = MEND_TOOL_METADATA[toolName];
      expect(metadata.inputSchema.type).toBe("object");
      expect(metadata.inputSchema.additionalProperties).toBe(false);
      expect(metadata.annotations.untrustedContentHint).toBe(true);
      if (toolName !== "get_repository_status") {
        expect(metadata.inputSchema.required?.length).toBeGreaterThan(0);
      }
      expect(metadata.description.length).toBeGreaterThan(40);
    }

    expect(MEND_TOOL_METADATA.get_audit_summary.annotations.readOnlyHint).toBe(
      true,
    );
    expect(MEND_TOOL_METADATA.list_issues.annotations.readOnlyHint).toBe(true);
    expect(MEND_TOOL_METADATA.inspect_issue.annotations.readOnlyHint).toBe(true);
    expect(MEND_TOOL_METADATA.compare_audits.annotations.readOnlyHint).toBe(true);
    expect(MEND_TOOL_METADATA.get_repository_status.annotations.readOnlyHint).toBe(
      true,
    );
    expect(MEND_TOOL_METADATA.list_repository_files.annotations.readOnlyHint).toBe(
      true,
    );
    expect(MEND_TOOL_METADATA.inspect_source.annotations.readOnlyHint).toBe(true);
    expect(MEND_TOOL_METADATA.propose_fix.annotations.readOnlyHint).toBe(false);
    expect(MEND_TOOL_METADATA.get_fix_diff.annotations.readOnlyHint).toBe(true);
    expect(MEND_TOOL_METADATA.request_fix_approval.annotations.readOnlyHint).toBe(
      false,
    );
    expect(MEND_TOOL_METADATA.apply_approved_fix.annotations.readOnlyHint).toBe(
      false,
    );
    expect(MEND_TOOL_METADATA.verify_fix.annotations.readOnlyHint).toBe(false);
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
      scanMode: "demo",
      scanProvider: "mend",
      scanWarning: null,
    });
    expect(result).not.toHaveProperty("issues");
    expect(onAudit).toHaveBeenCalledWith(demoAudit);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/audits",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("supports WebMCP runtimes that omit the optional execution context", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ audit: demoAudit })),
    );
    const summaryTool = createMendTools({ onAudit: vi.fn() }).find(
      (tool) => tool.name === "get_audit_summary",
    );

    const result = await summaryTool?.execute({ auditId: demoAudit.id });

    expect(result).toMatchObject({
      auditId: demoAudit.id,
      issueCount: demoAudit.issues.length,
      checkedLinks: 12,
      scanMode: "demo",
      scanProvider: "mend",
    });
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

  it("exposes connected source status and file metadata to the agent", async () => {
    const repository = createDemoRepository();
    const files = await listDemoRepositoryFiles();
    cacheRepositorySnapshot({ repository, files });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const tools = createMendTools({ onAudit: vi.fn() });
    const statusTool = tools.find((tool) => tool.name === "get_repository_status");
    const filesTool = tools.find((tool) => tool.name === "list_repository_files");

    const status = await statusTool?.execute({}, toolContext);
    const listed = await filesTool?.execute(
      { repositoryId: repository.id, limit: 2 },
      toolContext,
    );

    expect(status).toMatchObject({
      connected: true,
      repository: { id: repository.id, fullName: "mend/demo-site" },
      fileCount: 5,
    });
    expect(listed).toMatchObject({
      repositoryId: repository.id,
      total: 5,
      returned: 2,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("proposes a diff, requests approval, and synchronizes the UI callback", async () => {
    const fix = {
      fixId: "fix_demo_issue_img_alt_test",
      id: "fix_demo_issue_img_alt_test",
      repositoryId: "repo_demo_001",
      issueIds: ["issue_img_alt"],
      status: "proposed",
      approvalStatus: "not_requested",
      explanation: "A bounded demo patch.",
      expectedImpact: ["Improves accessible naming."],
      constraints: ["do not change visual design"],
      files: [
        {
          path: "components/Hero.tsx",
          original: 'alt=""',
          proposed: 'alt="Hero"',
          diff: '-alt=""\n+alt="Hero"',
          additions: 1,
          deletions: 1,
        },
      ],
      requiresHumanApproval: true,
    };
    const approvedFix = {
      ...fix,
      status: "proposed",
      approvalStatus: "waiting_for_human",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ fix }))
      .mockResolvedValueOnce(Response.json({ fix: approvedFix }));
    vi.stubGlobal("fetch", fetchMock);
    const onFix = vi.fn();
    const tools = createMendTools({ onAudit: vi.fn(), onFix });
    const proposeTool = tools.find((tool) => tool.name === "propose_fix");
    const diffTool = tools.find((tool) => tool.name === "get_fix_diff");
    const approvalTool = tools.find((tool) => tool.name === "request_fix_approval");

    const proposal = await proposeTool?.execute(
      {
        repositoryId: "repo_demo_001",
        issueIds: ["issue_img_alt"],
        constraints: ["do not change visual design"],
      },
      toolContext,
    );
    const diff = await diffTool?.execute({ fixId: fix.id }, toolContext);
    const approval = await approvalTool?.execute({ fixId: fix.id }, toolContext);

    expect(proposal).toMatchObject({
      fixId: fix.id,
      filesChanged: 1,
      requiresHumanApproval: true,
    });
    expect(diff).toHaveProperty("files.0.diff", fix.files[0].diff);
    expect(approval).toMatchObject({
      fixId: fix.id,
      approvalStatus: "waiting_for_human",
    });
    expect(onFix).toHaveBeenNthCalledWith(1, fix);
    expect(onFix).toHaveBeenNthCalledWith(2, approvedFix);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("applies an approved fix through a branch-first response", async () => {
    const fix = {
      id: "fix_demo_issue_img_alt_apply",
      fixId: "fix_demo_issue_img_alt_apply",
      repositoryId: "repo_demo_001",
      issueIds: ["issue_img_alt"],
      status: "applied",
      approvalStatus: "approved",
      explanation: "A bounded demo patch.",
      expectedImpact: ["Improves accessible naming."],
      constraints: [],
      files: [],
      requiresHumanApproval: true,
    };
    const branch = {
      fixId: fix.id,
      repositoryId: "repo_demo_001",
      branchName: "mend/fix/" + fix.id,
      baseBranch: "main",
      commitSha: "a".repeat(40),
      filesChanged: 1,
      filePaths: ["components/Hero.tsx"],
      createdAt: "2026-08-26T08:00:00.000Z",
      pullRequestUrl: null,
    };
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        applied: true,
        fix,
        branch,
        sourceMutation: false,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const onApply = vi.fn();
    const tools = createMendTools({ onAudit: vi.fn(), onApply });
    const applyTool = tools.find((tool) => tool.name === "apply_approved_fix");

    const result = await applyTool?.execute({ fixId: fix.id }, toolContext);

    expect(result).toMatchObject({
      applied: true,
      fixId: fix.id,
      branchName: branch.branchName,
      baseBranch: "main",
      sourceMutation: false,
    });
    expect(onApply).toHaveBeenCalledWith(fix, branch);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/fixes/apply",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("verifies an applied fix and synchronizes the result with the UI", async () => {
    const fix = {
      id: "fix_demo_issue_img_alt_verify",
      fixId: "fix_demo_issue_img_alt_verify",
      repositoryId: "repo_demo_001",
      issueIds: ["issue_img_alt"],
      status: "verified",
      approvalStatus: "approved",
      explanation: "A bounded demo patch.",
      expectedImpact: ["Improves accessible naming."],
      constraints: [],
      files: [],
      requiresHumanApproval: true,
    };
    const verification = {
      id: "verification_" + fix.id,
      fixId: fix.id,
      repositoryId: "repo_demo_001",
      branchName: "mend/fix/" + fix.id,
      mode: "source_snapshot",
      previewUrl: "https://preview.example.com/mend/",
      verified: true,
      verifiedAt: "2026-08-26T08:10:00.000Z",
      beforeAuditId: "audit_before_verify",
      afterAuditId: "audit_after_verify",
      before: { scores: { accessibility: 74 }, brokenLinks: 3, issueCount: 6 },
      after: { scores: { accessibility: 83 }, brokenLinks: 3, issueCount: 5 },
      scoreDelta: { accessibility: 9 },
      brokenLinksDelta: 0,
      resolvedIssueIds: ["issue_img_alt"],
      remainingIssueIds: ["issue_form_label"],
      regressions: [],
      checks: [
        {
          label: "Target issues",
          status: "passed",
          detail: "1 of 1 targeted issue resolved.",
        },
      ],
    };
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        verified: true,
        verification,
        fix,
        beforeAudit: { id: verification.beforeAuditId, issues: [] },
        afterAudit: { id: verification.afterAuditId, issues: [] },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const onVerify = vi.fn();
    const tools = createMendTools({ onAudit: vi.fn(), onVerify });
    const verifyTool = tools.find((tool) => tool.name === "verify_fix");

    const result = await verifyTool?.execute(
      { fixId: fix.id, previewUrl: verification.previewUrl },
      toolContext,
    );

    expect(result).toMatchObject({
      verified: true,
      fixId: fix.id,
      beforeAuditId: verification.beforeAuditId,
      afterAuditId: verification.afterAuditId,
      scoreDelta: { accessibility: 9 },
      resolvedIssueIds: ["issue_img_alt"],
    });
    expect(onVerify).toHaveBeenCalledWith(verification);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/verify",
      expect.objectContaining({ method: "POST" }),
    );
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
    expect(registerTool).toHaveBeenCalledTimes(MEND_TOOL_NAMES.length);
    expect(registerTool.mock.calls[0][1].signal.aborted).toBe(false);

    cleanup();

    expect(registerTool.mock.calls[0][1].signal.aborted).toBe(true);
  });
});

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
