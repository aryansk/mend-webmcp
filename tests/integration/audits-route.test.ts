import { describe, expect, it } from "vitest";
import { POST } from "../../app/api/audits/route";
import { GET } from "../../app/api/audits/route";
import { demoAudit, demoIssues } from "../../lib/demo-data";
import { saveAudit } from "../../lib/audit/store";

describe("audits API", () => {
  it("returns a normalized controlled demo audit", async () => {
    const request = new Request("http://localhost/api/audits", {
      method: "POST",
      body: JSON.stringify({
        url: "https://demo.mend.local",
        categories: ["accessibility", "performance"],
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const payload = (await response.json()) as {
      audit?: {
        scores?: Record<string, number | undefined>;
        issues?: Array<{ category: string }>;
      };
    };

    expect(response.status).toBe(201);
    expect(payload.audit?.scores?.seo).toBeUndefined();
    expect(
      payload.audit?.issues?.every(
        (issue) =>
          issue.category === "accessibility" || issue.category === "performance",
      ),
    ).toBe(true);
  });

  it("rejects private targets", async () => {
    const request = new Request("http://localhost/api/audits", {
      method: "POST",
      body: JSON.stringify({ url: "http://127.0.0.1:3000" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("returns issue inspection data from the stored audit", async () => {
    saveAudit(demoAudit);
    const request = new Request(
      "http://localhost/api/audits?issueId=issue_img_alt",
    );
    const response = await GET(request);
    const payload = (await response.json()) as {
      issue?: { id: string; title: string };
      sourceHints?: Array<{ filePath?: string }>;
    };

    expect(response.status).toBe(200);
    expect(payload.issue).toMatchObject({
      id: "issue_img_alt",
      title: "Hero image is missing alternative text",
    });
    expect(payload.sourceHints?.[0]?.filePath).toBe("components/Hero.tsx");
  });

  it("returns a before and after audit comparison", async () => {
    saveAudit({ ...demoAudit, id: "audit_before_route" });
    saveAudit({
      ...demoAudit,
      id: "audit_after_route",
      scores: { performance: 91, accessibility: 98, seo: 94 },
      brokenLinks: 0,
      issues: demoIssues.slice(1),
    });

    const request = new Request(
      "http://localhost/api/audits?beforeAuditId=audit_before_route&afterAuditId=audit_after_route",
    );
    const response = await GET(request);
    const payload = (await response.json()) as {
      comparison?: {
        scoreDelta?: { performance?: number };
        resolvedIssueIds?: string[];
      };
    };

    expect(response.status).toBe(200);
    expect(payload.comparison?.scoreDelta?.performance).toBe(30);
    expect(payload.comparison?.resolvedIssueIds).toContain("issue_img_alt");
  });
});
