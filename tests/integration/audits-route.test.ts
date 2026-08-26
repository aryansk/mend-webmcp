import { describe, expect, it } from "vitest";
import { POST } from "../../app/api/audits/route";

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
});
