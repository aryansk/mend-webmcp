import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { analyzeDocument } from "../../lib/audit/analyzers";
import type { AuditCategory } from "../../lib/types";

const fixture = readFileSync(
  new URL("../fixtures/audit-page.html", import.meta.url),
  "utf8",
);

const categories = new Set<AuditCategory>([
  "accessibility",
  "performance",
  "seo",
  "link",
]);

describe("HTML audit analyzers", () => {
  it("normalizes accessibility, performance, SEO, and link findings", () => {
    const result = analyzeDocument({
      auditId: "audit_fixture",
      pageUrl: "https://fixture.test/",
      html: fixture,
      responseBytes: 320_000,
      responseTimeMs: 1_800,
      categories,
      imageResources: [
        {
          url: "https://fixture.test/hero.jpg",
          status: 200,
          ok: true,
          contentLength: 480_000,
        },
      ],
      linkResults: [
        {
          url: "https://fixture.test/missing",
          status: 404,
          ok: false,
        },
      ],
    });

    const titles = result.issues.map((issue) => issue.title);

    expect(titles).toContain("Image is missing alternative text");
    expect(titles).toContain("Form control has no associated label");
    expect(titles).toContain("Heading hierarchy skips a level");
    expect(titles).toContain("Render-blocking scripts delay the first paint");
    expect(titles).toContain("Image asset is larger than its likely rendered need");
    expect(titles).toContain("Page is missing a meta description");
    expect(titles).toContain("Internal link does not resolve");
    expect(result.brokenLinks).toBe(1);
    expect(result.scores.accessibility).toBeLessThan(100);
    expect(result.scores.performance).toBeLessThan(100);
    expect(result.scores.seo).toBeLessThan(100);
  });

  it("only emits requested categories", () => {
    const result = analyzeDocument({
      auditId: "audit_fixture_filtered",
      pageUrl: "https://fixture.test/",
      html: fixture,
      responseBytes: 50_000,
      responseTimeMs: 300,
      categories: new Set<AuditCategory>(["accessibility"]),
      imageResources: [],
      linkResults: [],
    });

    expect(result.issues.every((issue) => issue.category === "accessibility")).toBe(
      true,
    );
    expect(result.scores).toEqual({ accessibility: expect.any(Number) });
    expect(result.brokenLinks).toBe(0);
  });
});
