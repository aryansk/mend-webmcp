import type { Audit, Issue } from "./types";

export const demoAuditId = "audit_demo_001";

export const demoIssues: Issue[] = [
  {
    id: "issue_img_alt",
    auditId: demoAuditId,
    category: "accessibility",
    severity: "high",
    title: "Hero image is missing alternative text",
    description:
      "The primary hero image has no meaningful alt text, so screen-reader users lose the context communicated visually.",
    pageUrl: "https://demo.mend.local/",
    selector: "main > section.hero img",
    sourceHint: {
      filePath: "components/Hero.tsx",
      lineStart: 15,
      lineEnd: 20,
      confidence: 0.94,
      reason: "The component contains the matching hero asset and heading.",
    },
    evidence: '<img src="/images/hero.webp" alt="">',
    estimatedImpact: "Improves the first meaningful experience for assistive-technology users.",
  },
  {
    id: "issue_form_label",
    auditId: demoAuditId,
    category: "accessibility",
    severity: "high",
    title: "Email field has no associated label",
    description:
      "The newsletter input is visually identified but is not programmatically labelled for keyboard and screen-reader users.",
    pageUrl: "https://demo.mend.local/",
    selector: "form.newsletter input[type=email]",
    sourceHint: {
      filePath: "components/NewsletterForm.tsx",
      lineStart: 6,
      lineEnd: 11,
      confidence: 0.89,
      reason: "The selector and input type match the form component.",
    },
    evidence: '<input type="email" placeholder="you@example.com">',
    estimatedImpact: "Restores a clear name for the form control without changing its visual design.",
  },
  {
    id: "issue_hero_size",
    auditId: demoAuditId,
    category: "performance",
    severity: "high",
    title: "Hero image is larger than its rendered size",
    description:
      "The hero asset is downloaded at 2.8 MB even though the largest rendered viewport only needs a 640 px image.",
    pageUrl: "https://demo.mend.local/",
    selector: "main > section.hero img",
    sourceHint: {
      filePath: "components/Hero.tsx",
      lineStart: 15,
      lineEnd: 20,
      confidence: 0.81,
      reason: "The image import is used by the hero component.",
    },
    evidence: "Transferred: 2.8 MB · Rendered: 640 × 420 px",
    estimatedImpact: "Reduces the largest contentful paint cost on slower connections.",
  },
  {
    id: "issue_heading_order",
    auditId: demoAuditId,
    category: "accessibility",
    severity: "medium",
    title: "Heading hierarchy skips from H1 to H3",
    description:
      "The feature section jumps over H2, making the page outline harder to navigate with heading shortcuts.",
    pageUrl: "https://demo.mend.local/features",
    selector: "section.features h3",
    sourceHint: {
      filePath: "app/features/page.tsx",
      lineStart: 11,
      lineEnd: 11,
      confidence: 0.73,
      reason: "The route and heading text match the feature page.",
    },
    evidence: "<h1>Build with confidence</h1> … <h3>Human approval</h3>",
    estimatedImpact: "Makes the document structure easier to scan without visual changes.",
  },
  {
    id: "issue_blocking_script",
    auditId: demoAuditId,
    category: "performance",
    severity: "medium",
    title: "Analytics script blocks initial rendering",
    description:
      "A non-critical analytics script is loaded synchronously in the document head.",
    pageUrl: "https://demo.mend.local/",
    selector: "head > script[src*='analytics']",
    sourceHint: {
      filePath: "app/layout.tsx",
      lineStart: 12,
      lineEnd: 12,
      confidence: 0.76,
      reason: "The layout contains the shared analytics script.",
    },
    evidence: '<script src="/analytics.js"></script>',
    estimatedImpact: "Lets the page paint before non-essential telemetry is requested.",
  },
  {
    id: "issue_meta_description",
    auditId: demoAuditId,
    category: "seo",
    severity: "low",
    title: "Page is missing a meta description",
    description:
      "Search engines have no concise page summary to use for the homepage result snippet.",
    pageUrl: "https://demo.mend.local/",
    selector: "head",
    sourceHint: {
      filePath: "app/layout.tsx",
      lineStart: 3,
      lineEnd: 5,
      confidence: 0.68,
      reason: "The root metadata object is the likely source of the missing field.",
    },
    evidence: "No <meta name=\"description\"> found",
    estimatedImpact: "Improves the quality of the search result preview.",
  },
];

export const demoAudit: Audit = {
  id: demoAuditId,
  siteUrl: "https://demo.mend.local/",
  createdAt: "2026-08-26T07:30:00.000Z",
  scores: {
    performance: 61,
    accessibility: 74,
    seo: 82,
  },
  brokenLinks: 3,
  issues: demoIssues,
};
