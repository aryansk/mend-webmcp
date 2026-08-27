import { describe, expect, it } from "vitest";
import { mergePageSpeedResult } from "../../lib/audit/pagespeed";
import type { Audit } from "../../lib/types";

const staticAudit: Audit = {
  id: "audit_pagespeed_fixture",
  siteUrl: "https://example.com/",
  finalUrl: "https://example.com/",
  createdAt: "2026-08-27T00:00:00.000Z",
  scores: { performance: 91, accessibility: 85, seo: 100 },
  brokenLinks: 1,
  checkedLinks: 4,
  scanMode: "static_html",
  scanProvider: "mend",
  issues: [
    {
      id: "link_static",
      auditId: "audit_pagespeed_fixture",
      category: "link",
      severity: "medium",
      title: "Internal link does not resolve",
      description: "A same-site route returned 404.",
      pageUrl: "https://example.com/",
    },
    {
      id: "a11y_static",
      auditId: "audit_pagespeed_fixture",
      category: "accessibility",
      severity: "high",
      title: "Static accessibility finding",
      description: "This should be replaced by rendered findings.",
      pageUrl: "https://example.com/",
    },
  ],
};

describe("PageSpeed audit normalization", () => {
  it("uses measured scores and bounded rendered findings while preserving link checks", () => {
    const result = mergePageSpeedResult(
      staticAudit,
      {
        lighthouseResult: {
          finalUrl: "https://www.example.com/",
          lighthouseVersion: "13.0.1",
          categories: {
            performance: {
              score: 0.72,
              auditRefs: [{ id: "largest-contentful-paint", weight: 25 }],
            },
            accessibility: {
              score: 0.88,
              auditRefs: [{ id: "button-name", weight: 10 }],
            },
          },
          audits: {
            "largest-contentful-paint": {
              id: "largest-contentful-paint",
              title: "Largest Contentful Paint",
              description: "Largest Contentful Paint marks the render time.",
              displayValue: "4.2 s",
              score: 0.34,
            },
            "button-name": {
              id: "button-name",
              title: "Buttons do not have an accessible name",
              description: "[Accessible names](https://web.dev/button-name/) help users.",
              score: 0,
              details: {
                items: [{ node: { selector: "button.icon-only" } }],
              },
            },
          },
        },
      },
      ["performance", "accessibility", "link"],
    );

    expect(result).toMatchObject({
      finalUrl: "https://www.example.com/",
      scanMode: "lighthouse_mobile",
      scanProvider: "google_pagespeed",
      lighthouseVersion: "13.0.1",
      scores: { performance: 72, accessibility: 88, seo: 100 },
    });
    expect(result.issues.map((issue) => issue.title)).toEqual(
      expect.arrayContaining([
        "Largest Contentful Paint",
        "Buttons do not have an accessible name",
        "Internal link does not resolve",
      ]),
    );
    expect(result.issues.some((issue) => issue.id === "a11y_static")).toBe(false);
    expect(
      result.issues.find((issue) => issue.title.startsWith("Buttons")),
    ).toMatchObject({
      category: "accessibility",
      severity: "high",
      selector: "button.icon-only",
    });
  });

  it("rejects a Lighthouse runtime error", () => {
    expect(() =>
      mergePageSpeedResult(
        staticAudit,
        { lighthouseResult: { runtimeError: { message: "Navigation timed out" } } },
        ["performance"],
      ),
    ).toThrow("Navigation timed out");
  });
});
