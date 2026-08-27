import { afterEach, describe, expect, it } from "vitest";
import { POST as proposeFix } from "../../app/api/fixes/route";
import { POST as requestApproval } from "../../app/api/fixes/approval/route";
import { POST as decideFix } from "../../app/api/fixes/decision/route";
import { POST as applyFix } from "../../app/api/fixes/apply/route";
import { POST as verifyFix } from "../../app/api/verify/route";
import { GET as getAudit } from "../../app/api/audits/route";
import { clearAuditStore } from "../../lib/audit/store";
import { clearDemoBranchStore } from "../../lib/fixes/apply";
import { clearFixStore } from "../../lib/fixes/store";
import { clearVerificationStore } from "../../lib/verification/service";
import { readDemoRepositoryFile } from "../../lib/repository/files";

afterEach(() => {
  clearAuditStore();
  clearFixStore();
  clearDemoBranchStore();
  clearVerificationStore();
});

async function createAppliedFix() {
  const proposalResponse = await proposeFix(
    new Request("http://localhost/api/fixes", {
      method: "POST",
      body: JSON.stringify({
        repositoryId: "repo_demo_001",
        issueIds: ["issue_img_alt"],
      }),
      headers: { "Content-Type": "application/json" },
    }),
  );
  const proposal = (await proposalResponse.json()) as { fix: { id: string } };

  await requestApproval(
    new Request("http://localhost/api/fixes/approval", {
      method: "POST",
      body: JSON.stringify({ fixId: proposal.fix.id }),
      headers: { "Content-Type": "application/json" },
    }),
  );
  await decideFix(
    new Request("http://localhost/api/fixes/decision", {
      method: "POST",
      body: JSON.stringify({ fixId: proposal.fix.id, decision: "approved" }),
      headers: { "Content-Type": "application/json" },
    }),
  );
  await applyFix(
    new Request("http://localhost/api/fixes/apply", {
      method: "POST",
      body: JSON.stringify({ fixId: proposal.fix.id }),
      headers: { "Content-Type": "application/json" },
    }),
  );

  return proposal.fix.id;
}

describe("fix verification API", () => {
  it("requires an applied branch before verification", async () => {
    const proposalResponse = await proposeFix(
      new Request("http://localhost/api/fixes", {
        method: "POST",
        body: JSON.stringify({
          repositoryId: "repo_demo_001",
          issueIds: ["issue_img_alt"],
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    const proposal = (await proposalResponse.json()) as { fix: { id: string } };
    const response = await verifyFix(
      new Request("http://localhost/api/verify", {
        method: "POST",
        body: JSON.stringify({ fixId: proposal.fix.id }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    const payload = (await response.json()) as { code?: string };

    expect(response.status).toBe(409);
    expect(payload.code).toBe("fix_not_applied");
  });

  it("verifies a resolved demo issue and preserves the audit chain", async () => {
    const beforeSource = await readDemoRepositoryFile("components/Hero.tsx");
    const fixId = await createAppliedFix();
    const response = await verifyFix(
      new Request("http://localhost/api/verify", {
        method: "POST",
        body: JSON.stringify({
          fixId,
          previewUrl: "https://preview.example.com/mend/",
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    const payload = (await response.json()) as {
      verified?: boolean;
      verification?: {
        mode: string;
        previewUrl: string | null;
        before?: { scores?: { accessibility?: number } };
        after?: { scores?: { accessibility?: number } };
        resolvedIssueIds: string[];
        regressions: unknown[];
        beforeAuditId: string;
        afterAuditId: string;
      };
      fix?: { status: string };
    };
    const afterSource = await readDemoRepositoryFile("components/Hero.tsx");
    const comparisonResponse = await getAudit(
      new Request(
        "http://localhost/api/audits?beforeAuditId=" +
          payload.verification?.beforeAuditId +
          "&afterAuditId=" +
          payload.verification?.afterAuditId,
      ),
    );

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      verified: true,
      verification: {
        mode: "source_snapshot",
        previewUrl: "https://preview.example.com/mend/",
        before: { scores: { accessibility: 74 } },
        after: { scores: { accessibility: 89 } },
        resolvedIssueIds: ["issue_img_alt"],
        regressions: [],
      },
      fix: { status: "verified" },
    });
    expect(comparisonResponse.status).toBe(200);
    expect(afterSource.content).toBe(beforeSource.content);
  });

  it("reconstructs an applied source snapshot from its signed receipt", async () => {
    const proposalResponse = await proposeFix(
      new Request("http://localhost/api/fixes", {
        method: "POST",
        body: JSON.stringify({
          repositoryId: "repo_demo_001",
          issueIds: ["issue_form_label"],
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    const proposal = (await proposalResponse.json()) as { fix: { id: string } };

    await requestApproval(
      new Request("http://localhost/api/fixes/approval", {
        method: "POST",
        body: JSON.stringify({ fixId: proposal.fix.id }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    const decisionResponse = await decideFix(
      new Request("http://localhost/api/fixes/decision", {
        method: "POST",
        body: JSON.stringify({ fixId: proposal.fix.id, decision: "approved" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    const approvalCookie = decisionResponse.headers
      .get("set-cookie")
      ?.split(";")[0];
    const applyResponse = await applyFix(
      new Request("http://localhost/api/fixes/apply", {
        method: "POST",
        body: JSON.stringify({ fixId: proposal.fix.id }),
        headers: {
          "Content-Type": "application/json",
          Cookie: approvalCookie ?? "",
        },
      }),
    );
    const appliedCookie = applyResponse.headers.get("set-cookie")?.split(";")[0];

    clearFixStore();
    clearDemoBranchStore();
    clearVerificationStore();

    const response = await verifyFix(
      new Request("http://localhost/api/verify", {
        method: "POST",
        body: JSON.stringify({ fixId: proposal.fix.id }),
        headers: {
          "Content-Type": "application/json",
          Cookie: appliedCookie ?? "",
        },
      }),
    );
    const payload = (await response.json()) as {
      verification?: { resolvedIssueIds?: string[]; mode?: string };
    };

    expect(appliedCookie).toContain("mend_applied_receipt=");
    expect(response.status).toBe(200);
    expect(payload.verification).toMatchObject({
      resolvedIssueIds: ["issue_form_label"],
      mode: "source_snapshot",
    });
  });
});
