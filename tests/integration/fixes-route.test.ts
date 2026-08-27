import { afterEach, describe, expect, it } from "vitest";
import { POST as proposeFix } from "../../app/api/fixes/route";
import { POST as requestApproval } from "../../app/api/fixes/approval/route";
import { POST as decideFix } from "../../app/api/fixes/decision/route";
import { POST as applyFix } from "../../app/api/fixes/apply/route";
import { clearDemoBranchStore } from "../../lib/fixes/apply";
import { clearFixStore } from "../../lib/fixes/store";
import { readDemoRepositoryFile } from "../../lib/repository/files";

afterEach(() => {
  clearFixStore();
  clearDemoBranchStore();
});

describe("fix proposal and approval APIs", () => {
  it("returns a source diff and leaves the repository unchanged", async () => {
    const before = await readDemoRepositoryFile("components/Hero.tsx");
    const response = await proposeFix(
      new Request("http://localhost/api/fixes", {
        method: "POST",
        body: JSON.stringify({
          repositoryId: "repo_demo_001",
          issueIds: ["issue_img_alt"],
          constraints: ["do not change visual design"],
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    const payload = (await response.json()) as {
      fix?: {
        id: string;
        status: string;
        approvalStatus: string;
        files: Array<{ path: string; diff: string }>;
      };
    };
    const after = await readDemoRepositoryFile("components/Hero.tsx");

    expect(response.status).toBe(201);
    expect(payload.fix).toMatchObject({
      status: "proposed",
      approvalStatus: "not_requested",
    });
    expect(payload.fix?.files[0]).toMatchObject({
      path: "components/Hero.tsx",
    });
    expect(payload.fix?.files[0].diff).toContain(
      '+          alt="Team reviewing a website audit"',
    );
    expect(after.content).toBe(before.content);
  });

  it("requires an approval request before a human decision", async () => {
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

    const earlyDecision = await decideFix(
      new Request("http://localhost/api/fixes/decision", {
        method: "POST",
        body: JSON.stringify({
          fixId: proposal.fix.id,
          decision: "approved",
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    const earlyPayload = (await earlyDecision.json()) as { code?: string };

    expect(earlyDecision.status).toBe(409);
    expect(earlyPayload.code).toBe("approval_required");
  });

  it("records waiting, approved, and rejected states without applying source", async () => {
    const proposalResponse = await proposeFix(
      new Request("http://localhost/api/fixes", {
        method: "POST",
        body: JSON.stringify({
          repositoryId: "repo_demo_001",
          issueIds: ["issue_heading_order"],
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    const proposal = (await proposalResponse.json()) as { fix: { id: string } };
    const earlyApply = await applyFix(
      new Request("http://localhost/api/fixes/apply", {
        method: "POST",
        body: JSON.stringify({ fixId: proposal.fix.id }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    const earlyApplyPayload = (await earlyApply.json()) as { code?: string };

    expect(earlyApply.status).toBe(409);
    expect(earlyApplyPayload.code).toBe("approval_required");

    const approvalResponse = await requestApproval(
      new Request("http://localhost/api/fixes/approval", {
        method: "POST",
        body: JSON.stringify({ fixId: proposal.fix.id }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    const approvalPayload = (await approvalResponse.json()) as {
      fix: { approvalStatus: string };
    };
    const decisionResponse = await decideFix(
      new Request("http://localhost/api/fixes/decision", {
        method: "POST",
        body: JSON.stringify({
          fixId: proposal.fix.id,
          decision: "approved",
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    const decisionPayload = (await decisionResponse.json()) as {
      fix: { status: string; approvalStatus: string };
    };
    const source = await readDemoRepositoryFile("app/features/page.tsx");

    expect(approvalResponse.status).toBe(200);
    expect(approvalPayload.fix.approvalStatus).toBe("waiting_for_human");
    expect(decisionResponse.status).toBe(200);
    expect(decisionPayload.fix).toMatchObject({
      status: "approved",
      approvalStatus: "approved",
    });
    expect(source.content).toContain("<h3>Human approval</h3>");
  });

  it("creates an isolated branch record only after approval and leaves main untouched", async () => {
    const before = await readDemoRepositoryFile("components/Hero.tsx");
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
    const approvalResponse = await requestApproval(
      new Request("http://localhost/api/fixes/approval", {
        method: "POST",
        body: JSON.stringify({ fixId: proposal.fix.id }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(approvalResponse.status).toBe(200);
    await decideFix(
      new Request("http://localhost/api/fixes/decision", {
        method: "POST",
        body: JSON.stringify({
          fixId: proposal.fix.id,
          decision: "approved",
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    const applyResponse = await applyFix(
      new Request("http://localhost/api/fixes/apply", {
        method: "POST",
        body: JSON.stringify({ fixId: proposal.fix.id }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    const applyPayload = (await applyResponse.json()) as {
      applied?: boolean;
      sourceMutation?: boolean;
      fix?: { status: string; approvalStatus: string };
      branch?: {
        branchName: string;
        baseBranch: string;
        commitSha: string;
        filesChanged: number;
      };
    };
    const after = await readDemoRepositoryFile("components/Hero.tsx");

    expect(applyResponse.status).toBe(200);
    expect(applyPayload).toMatchObject({
      applied: true,
      sourceMutation: false,
      fix: { status: "applied", approvalStatus: "approved" },
      branch: {
        branchName: "mend/fix/" + proposal.fix.id,
        baseBranch: "main",
        filesChanged: 1,
      },
    });
    expect(applyPayload.branch?.commitSha).toHaveLength(40);
    expect(after.content).toBe(before.content);

    const repeatResponse = await applyFix(
      new Request("http://localhost/api/fixes/apply", {
        method: "POST",
        body: JSON.stringify({ fixId: proposal.fix.id }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    const repeatPayload = (await repeatResponse.json()) as {
      branch?: { commitSha: string };
    };

    expect(repeatResponse.status).toBe(200);
    expect(repeatPayload.branch?.commitSha).toBe(applyPayload.branch?.commitSha);
  });

  it("restores an approved demo fix from a signed HttpOnly receipt", async () => {
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

    clearFixStore();
    clearDemoBranchStore();

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
    const payload = (await applyResponse.json()) as {
      applied?: boolean;
      fix?: { approvalStatus?: string };
    };

    expect(approvalCookie).toContain("mend_approval_receipt=");
    expect(applyResponse.status).toBe(200);
    expect(payload).toMatchObject({
      applied: true,
      fix: { approvalStatus: "approved" },
    });
    expect(applyResponse.headers.get("set-cookie")).toContain(
      "mend_applied_receipt=",
    );
  });
});
