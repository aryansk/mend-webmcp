import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";
import { createHash } from "node:crypto";
import type { AuditCategory, Audit, Issue, ScoreKey, Severity } from "../types";
import type { ResourceProbe } from "./fetch";

export type DocumentAnalysisInput = {
  auditId: string;
  pageUrl: string;
  html: string;
  responseBytes: number;
  responseTimeMs: number;
  categories: ReadonlySet<AuditCategory>;
  imageResources: ResourceProbe[];
  linkResults: ResourceProbe[];
};

type IssueDraft = Omit<Issue, "id" | "auditId">;

type DraftWithKey = {
  key: string;
  draft: IssueDraft;
};

export type DocumentAnalysis = {
  issues: Issue[];
  scores: Partial<Record<ScoreKey, number>>;
  brokenLinks: number;
};

export function analyzeDocument(input: DocumentAnalysisInput): DocumentAnalysis {
  const $ = cheerio.load(input.html);
  const drafts: DraftWithKey[] = [];

  const addIssue = (key: string, draft: IssueDraft) => {
    drafts.push({ key, draft });
  };

  if (input.categories.has("accessibility")) {
    analyzeAccessibility($, input.pageUrl, addIssue);
  }

  if (input.categories.has("performance")) {
    analyzePerformance($, input, addIssue);
  }

  if (input.categories.has("seo")) {
    analyzeSeo($, input.pageUrl, addIssue);
  }

  if (input.categories.has("link")) {
    analyzeLinks(input.pageUrl, input.linkResults, addIssue);
  }

  const issues = drafts
    .map(({ key, draft }) => ({
      ...draft,
      id: createIssueId(input.auditId, key),
      auditId: input.auditId,
    }))
    .sort(compareIssues);

  const scores: Partial<Record<ScoreKey, number>> = {};

  if (input.categories.has("accessibility")) {
    scores.accessibility = scoreCategory(issues, "accessibility");
  }

  if (input.categories.has("performance")) {
    scores.performance = scoreCategory(issues, "performance");
  }

  if (input.categories.has("seo")) {
    scores.seo = scoreCategory(issues, "seo");
  }

  return {
    issues,
    scores,
    brokenLinks: input.linkResults.filter((resource) => !resource.ok).length,
  };
}

function analyzeAccessibility(
  $: CheerioAPI,
  pageUrl: string,
  addIssue: (key: string, draft: IssueDraft) => void,
) {
  $("img").each((index, element) => {
    const alt = $(element).attr("alt");

    if (alt !== undefined) {
      return;
    }

    const selector = selectorFor($, element);
    addIssue("missing-alt-" + index + "-" + selector, {
      category: "accessibility",
      severity: "high",
      title: "Image is missing alternative text",
      description:
        "This image has no alt attribute, so assistive-technology users cannot tell what information it conveys.",
      pageUrl,
      selector,
      evidence: selector + " · alt attribute missing",
      estimatedImpact:
        "Restores meaningful context for screen-reader and voice-control users.",
    });
  });

  $("input, select, textarea").each((index, element) => {
    const type = ($(element).attr("type") ?? "").toLowerCase();

    if (["hidden", "submit", "button", "reset", "image"].includes(type)) {
      return;
    }

    const id = $(element).attr("id");
    const hasExplicitLabel =
      Boolean(id) &&
      $("label").toArray().some((label) => $(label).attr("for") === id);
    const hasWrappingLabel = $(element).parents("label").length > 0;
    const hasAriaLabel = Boolean(
      $(element).attr("aria-label")?.trim() ||
        $(element).attr("aria-labelledby")?.trim(),
    );

    if (hasExplicitLabel || hasWrappingLabel || hasAriaLabel) {
      return;
    }

    const selector = selectorFor($, element);
    addIssue("unlabeled-control-" + index + "-" + selector, {
      category: "accessibility",
      severity: "high",
      title: "Form control has no associated label",
      description:
        "This form control is not programmatically named, which makes it harder to use with a screen reader or voice input.",
      pageUrl,
      selector,
      evidence: selector + " · label, aria-label, and aria-labelledby not found",
      estimatedImpact:
        "Gives keyboard, screen-reader, and voice-control users a reliable field name.",
    });
  });

  let previousHeadingLevel = 0;
  let headingJump: { from: number; to: number; selector: string } | null = null;

  for (const element of $("h1, h2, h3, h4, h5, h6").toArray()) {
    const tagName = elementTag(element);
    const level = Number(tagName.slice(1));

    if (!headingJump && previousHeadingLevel && level > previousHeadingLevel + 1) {
      headingJump = {
        from: previousHeadingLevel,
        to: level,
        selector: selectorFor($, element),
      };
    }

    previousHeadingLevel = level;
  }

  if (headingJump) {
    addIssue("heading-jump-" + headingJump.selector, {
      category: "accessibility",
      severity: "medium",
      title: "Heading hierarchy skips a level",
      description:
        "The document outline jumps from H" +
        headingJump.from +
        " to H" +
        headingJump.to +
        ", which makes heading navigation less predictable.",
      pageUrl,
      selector: headingJump.selector,
      evidence:
        "H" +
        headingJump.from +
        " → " +
        headingJump.selector +
        " (H" +
        headingJump.to +
        ")",
      estimatedImpact:
        "Makes the page structure easier to scan with heading shortcuts.",
    });
  }

  if ($("h1").length === 0 && $("body").text().trim().length > 0) {
    addIssue("missing-h1", {
      category: "accessibility",
      severity: "medium",
      title: "Page is missing a primary H1 heading",
      description:
        "The page has visible content but no H1 to identify its primary topic.",
      pageUrl,
      selector: "body",
      evidence: "No h1 element found",
      estimatedImpact:
        "Gives assistive-technology users a clear starting point for the page.",
    });
  }

  $("button").each((index, element) => {
    const accessibleName = [
      $(element).text(),
      $(element).attr("aria-label"),
      $(element).attr("title"),
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    if (accessibleName) {
      return;
    }

    const selector = selectorFor($, element);
    addIssue("unnamed-button-" + index + "-" + selector, {
      category: "accessibility",
      severity: "medium",
      title: "Button has no accessible name",
      description:
        "The button has no visible text or accessible naming attribute.",
      pageUrl,
      selector,
      evidence: selector + " · no text, aria-label, or title",
      estimatedImpact:
        "Makes the action discoverable to screen readers and voice-control users.",
    });
  });
}

function analyzePerformance(
  $: CheerioAPI,
  input: DocumentAnalysisInput,
  addIssue: (key: string, draft: IssueDraft) => void,
) {
  if (input.responseBytes > 250_000) {
    addIssue("large-html", {
      category: "performance",
      severity: input.responseBytes > 500_000 ? "high" : "medium",
      title: "HTML response is larger than expected",
      description:
        "The initial HTML response is " +
        formatBytes(input.responseBytes) +
        ", which increases the amount of work before the page can become interactive.",
      pageUrl: input.pageUrl,
      selector: "html",
      evidence: "HTML transfer: " + formatBytes(input.responseBytes),
      estimatedImpact:
        "Reduces transfer and parse cost, especially on slower connections.",
    });
  }

  const blockingScripts = $("head script[src]").filter((_, element) => {
    const hasAsync = $(element).attr("async") !== undefined;
    const hasDefer = $(element).attr("defer") !== undefined;
    const isModule = $(element).attr("type") === "module";
    return !hasAsync && !hasDefer && !isModule;
  });

  if (blockingScripts.length > 0) {
    addIssue("render-blocking-scripts", {
      category: "performance",
      severity: "medium",
      title: "Render-blocking scripts delay the first paint",
      description:
        "A script in the document head is loaded synchronously even though it is not marked as async, defer, or module.",
      pageUrl: input.pageUrl,
      selector: "head script[src]",
      evidence: blockingScripts
        .slice(0, 3)
        .map((_, element) => $(element).attr("src") ?? "inline script")
        .get()
        .join(" · "),
      estimatedImpact:
        "Lets the browser paint the page before non-critical JavaScript executes.",
    });
  }

  const dimensionlessImages = $("img").filter((_, element) => {
    return !$(element).attr("width") || !$(element).attr("height");
  });

  if (dimensionlessImages.length > 0) {
    addIssue("image-dimensions", {
      category: "performance",
      severity: "medium",
      title: "Images are missing intrinsic dimensions",
      description:
        "One or more images have no width and height attributes, which can cause layout shifts while assets load.",
      pageUrl: input.pageUrl,
      selector: selectorFor($, dimensionlessImages.first().get(0)),
      evidence: dimensionlessImages.length + " image(s) missing width or height",
      estimatedImpact:
        "Reduces cumulative layout shift and makes page loading feel more stable.",
    });
  }

  input.imageResources
    .filter(
      (resource) =>
        resource.ok &&
        typeof resource.contentLength === "number" &&
        resource.contentLength > 350_000,
    )
    .slice(0, 3)
    .forEach((resource, index) => {
      addIssue("oversized-image-" + index + "-" + resource.url, {
        category: "performance",
        severity: resource.contentLength && resource.contentLength > 1_000_000 ? "high" : "medium",
        title: "Image asset is larger than its likely rendered need",
        description:
          "This image reports a transfer size of " +
          formatBytes(resource.contentLength ?? 0) +
          ".",
        pageUrl: input.pageUrl,
        selector: "img[src]",
        evidence:
          resource.url + " · " + formatBytes(resource.contentLength ?? 0),
        estimatedImpact:
          "Improves largest-contentful-paint performance on slower connections.",
      });
    });

  if (input.responseTimeMs > 1_500) {
    addIssue("slow-response", {
      category: "performance",
      severity: "low",
      title: "Initial HTML response took longer than expected",
      description:
        "Mend observed " +
        input.responseTimeMs +
        " ms before the HTML response was available.",
      pageUrl: input.pageUrl,
      selector: "document",
      evidence: "Observed server response: " + input.responseTimeMs + " ms",
      estimatedImpact:
        "Highlights server or network work that can delay the first render.",
    });
  }
}

function analyzeSeo(
  $: CheerioAPI,
  pageUrl: string,
  addIssue: (key: string, draft: IssueDraft) => void,
) {
  const title = $("title").first().text().trim();

  if (!title) {
    addIssue("missing-title", {
      category: "seo",
      severity: "high",
      title: "Page is missing a document title",
      description:
        "Search engines and browser tabs have no concise title for this page.",
      pageUrl,
      selector: "head",
      evidence: "No <title> element found",
      estimatedImpact:
        "Improves search result clarity and browser-tab navigation.",
    });
  } else if (title.length > 60) {
    addIssue("long-title", {
      category: "seo",
      severity: "low",
      title: "Document title is longer than recommended",
      description:
        "The title is " +
        title.length +
        " characters long, so search results may truncate it.",
      pageUrl,
      selector: "title",
      evidence: title,
      estimatedImpact: "Keeps the page title concise in search result previews.",
    });
  }

  const description = $("meta[name='description']").attr("content")?.trim();

  if (!description) {
    addIssue("missing-description", {
      category: "seo",
      severity: "medium",
      title: "Page is missing a meta description",
      description:
        "Search engines have no concise summary to use for the page result snippet.",
      pageUrl,
      selector: "meta[name='description']",
      evidence: "No meta[name=\"description\"] found",
      estimatedImpact:
        "Improves the quality of the search result preview.",
    });
  } else if (description.length > 160) {
    addIssue("long-description", {
      category: "seo",
      severity: "low",
      title: "Meta description is longer than recommended",
      description:
        "The description is " +
        description.length +
        " characters long and may be truncated in search results.",
      pageUrl,
      selector: "meta[name='description']",
      evidence: description,
      estimatedImpact:
        "Keeps the search result summary focused and readable.",
    });
  }

  if (!$("html").attr("lang")?.trim()) {
    addIssue("missing-language", {
      category: "seo",
      severity: "medium",
      title: "Document language is not declared",
      description:
        "The root HTML element does not declare a language for browsers and search engines.",
      pageUrl,
      selector: "html",
      evidence: "html[lang] missing",
      estimatedImpact:
        "Improves language selection for assistive technology and search indexing.",
    });
  }

  if ($("link[rel='canonical']").length === 0) {
    addIssue("missing-canonical", {
      category: "seo",
      severity: "low",
      title: "Page is missing a canonical URL",
      description:
        "The page does not identify its preferred URL for search engines.",
      pageUrl,
      selector: "head",
      evidence: "No link[rel=\"canonical\"] found",
      estimatedImpact:
        "Reduces ambiguity when the same content is reachable by multiple URLs.",
    });
  }

  if ($("meta[name='viewport']").length === 0) {
    addIssue("missing-viewport", {
      category: "seo",
      severity: "low",
      title: "Mobile viewport metadata is missing",
      description:
        "The page does not declare a viewport, which can lead to poor mobile rendering.",
      pageUrl,
      selector: "head",
      evidence: "No meta[name=\"viewport\"] found",
      estimatedImpact: "Improves responsive behavior on mobile browsers.",
    });
  }
}

function analyzeLinks(
  pageUrl: string,
  linkResults: ResourceProbe[],
  addIssue: (key: string, draft: IssueDraft) => void,
) {
  linkResults.forEach((resource) => {
    if (resource.ok) {
      return;
    }

    const statusText = resource.status
      ? "HTTP " + resource.status
      : resource.error ?? "request failed";

    addIssue("broken-link-" + resource.url, {
      category: "link",
      severity: resource.status === 404 || resource.status === 410 ? "high" : "medium",
      title: "Internal link does not resolve",
      description:
        "The page links to a same-site URL that Mend could not load successfully.",
      pageUrl,
      selector: "a[href]",
      evidence: resource.url + " · " + statusText,
      estimatedImpact:
        "Prevents visitors from reaching a promised page or resource.",
    });
  });
}

function scoreCategory(issues: Issue[], category: AuditCategory) {
  const deductions: Record<Severity, number> = {
    critical: 25,
    high: 15,
    medium: 8,
    low: 3,
  };

  const score = issues
    .filter((issue) => issue.category === category)
    .reduce((total, issue) => total - deductions[issue.severity], 100);

  return Math.max(0, Math.min(100, score));
}

function compareIssues(left: Issue, right: Issue) {
  const priority: Record<Severity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return priority[left.severity] - priority[right.severity] || left.title.localeCompare(right.title);
}

function createIssueId(auditId: string, key: string) {
  const digest = createHash("sha1")
    .update(auditId + ":" + key)
    .digest("hex")
    .slice(0, 10);

  return "issue_" + digest;
}

function selectorFor($: CheerioAPI, element: AnyNode | undefined) {
  if (!element) {
    return "document";
  }

  const tagName = elementTag(element);
  const id = $(element).attr("id");

  if (id && /^[A-Za-z][A-Za-z0-9_-]*$/.test(id)) {
    return tagName + "#" + id;
  }

  const className = $(element)
    .attr("class")
    ?.split(/\s+/)
    .find((value) => /^[A-Za-z][A-Za-z0-9_-]*$/.test(value));

  return className ? tagName + "." + className : tagName;
}

function elementTag(element: AnyNode) {
  return "tagName" in element && element.tagName
    ? element.tagName.toLowerCase()
    : "element";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return bytes + " B";
  }

  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + " KB";
  }

  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}
