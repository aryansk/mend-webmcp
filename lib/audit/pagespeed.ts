import { createHash } from "node:crypto";
import type {
  Audit,
  AuditCategory,
  Issue,
  ScoreKey,
  Severity,
} from "../types";

const API_ENDPOINT =
  "https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed";
const REQUEST_TIMEOUT_MS = 45_000;
const MAX_ISSUES_PER_CATEGORY = 6;

type LighthouseAudit = {
  id?: string;
  title?: string;
  description?: string;
  displayValue?: string;
  score?: number | null;
  details?: {
    items?: Array<{
      node?: { selector?: string; snippet?: string };
    }>;
  };
};

type LighthouseCategory = {
  score?: number | null;
  auditRefs?: Array<{ id?: string; weight?: number }>;
};

export type PageSpeedResponse = {
  lighthouseResult?: {
    finalUrl?: string;
    lighthouseVersion?: string;
    runtimeError?: { message?: string };
    runWarnings?: string[];
    categories?: Partial<Record<"performance" | "accessibility" | "seo", LighthouseCategory>>;
    audits?: Record<string, LighthouseAudit>;
  };
};

export async function enrichAuditWithPageSpeed(
  audit: Audit,
  categories: AuditCategory[],
) {
  if (
    process.env.MEND_PAGESPEED_ENABLED !== "true" ||
    !process.env.PAGESPEED_API_KEY?.trim()
  ) {
    return { ...audit, scanMode: "static_html" as const, scanProvider: "mend" as const };
  }

  try {
    const response = await fetchPageSpeed(audit.finalUrl ?? audit.siteUrl, categories);
    return mergePageSpeedResult(audit, response, categories);
  } catch (error) {
    return {
      ...audit,
      scanMode: "static_html" as const,
      scanProvider: "mend" as const,
      scanWarning:
        error instanceof Error
          ? "Rendered Lighthouse scan unavailable: " + error.message
          : "Rendered Lighthouse scan unavailable; static HTML results are shown.",
    };
  }
}

export function mergePageSpeedResult(
  audit: Audit,
  response: PageSpeedResponse,
  requestedCategories: AuditCategory[],
): Audit {
  const lighthouse = response.lighthouseResult;

  if (!lighthouse || lighthouse.runtimeError?.message) {
    throw new Error(
      lighthouse?.runtimeError?.message ?? "PageSpeed returned no Lighthouse result.",
    );
  }

  const measuredCategories = requestedCategories.filter(
    (category): category is "performance" | "accessibility" | "seo" =>
      category === "performance" ||
      category === "accessibility" ||
      category === "seo",
  );
  const availableMeasuredCategories = measuredCategories.filter(
    (category) =>
      typeof lighthouse.categories?.[category]?.score === "number",
  );
  const measuredIssues = availableMeasuredCategories.flatMap((category) =>
    issuesForCategory(audit, category, lighthouse.categories?.[category], lighthouse.audits),
  );
  const measuredScores = { ...audit.scores };

  for (const category of availableMeasuredCategories) {
    const score = lighthouse.categories?.[category]?.score;

    if (typeof score === "number") {
      measuredScores[category as ScoreKey] = Math.round(score * 100);
    }
  }

  const staticIssues = audit.issues.filter(
    (issue) =>
      !availableMeasuredCategories.includes(
        issue.category as "performance" | "accessibility" | "seo",
      ),
  );
  const warnings = (lighthouse.runWarnings ?? []).filter(Boolean).slice(0, 2);

  return {
    ...audit,
    finalUrl: lighthouse.finalUrl ?? audit.finalUrl,
    scores: measuredScores,
    issues: [...measuredIssues, ...staticIssues].sort(compareIssues),
    scanMode: "lighthouse_mobile",
    scanProvider: "google_pagespeed",
    lighthouseVersion: lighthouse.lighthouseVersion,
    scanWarning: warnings.length > 0 ? warnings.join(" ") : undefined,
  };
}

async function fetchPageSpeed(url: string, categories: AuditCategory[]) {
  const endpoint = new URL(API_ENDPOINT);
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("strategy", "mobile");
  endpoint.searchParams.set("locale", "en");
  endpoint.searchParams.set("key", process.env.PAGESPEED_API_KEY!.trim());

  for (const category of categories) {
    if (category !== "link") {
      endpoint.searchParams.append("category", category);
    }
  }

  const response = await fetch(endpoint, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error("PageSpeed returned HTTP " + response.status + ".");
  }

  return (await response.json()) as PageSpeedResponse;
}

function issuesForCategory(
  audit: Audit,
  category: "performance" | "accessibility" | "seo",
  lighthouseCategory: LighthouseCategory | undefined,
  audits: Record<string, LighthouseAudit> | undefined,
) {
  if (!lighthouseCategory?.auditRefs || !audits) {
    return [];
  }

  return lighthouseCategory.auditRefs
    .map((reference) => ({
      audit: reference.id ? audits[reference.id] : undefined,
      id: reference.id,
      weight: reference.weight ?? 0,
    }))
    .filter(
      (entry) =>
        entry.id &&
        entry.audit?.title &&
        typeof entry.audit.score === "number" &&
        entry.audit.score < 1 &&
        entry.weight > 0,
    )
    .sort((left, right) => {
      const scoreDelta = (left.audit?.score ?? 1) - (right.audit?.score ?? 1);
      return scoreDelta || right.weight - left.weight;
    })
    .slice(0, MAX_ISSUES_PER_CATEGORY)
    .map(({ audit: result, id, weight }) => {
      const selector = result?.details?.items?.find(
        (item) => item.node?.selector,
      )?.node?.selector;
      const evidence = [result?.displayValue, selector]
        .filter((value): value is string => Boolean(value?.trim()))
        .join(" · ");

      return {
        id: measuredIssueId(audit.id, id!),
        auditId: audit.id,
        category,
        severity: severityFor(result?.score ?? 1, weight),
        title: result!.title!,
        description: cleanLighthouseText(result?.description),
        pageUrl: audit.finalUrl ?? audit.siteUrl,
        selector,
        evidence: evidence || "Failed in a rendered mobile Lighthouse run.",
        estimatedImpact:
          "Resolving this measured Lighthouse failure should improve the rendered " +
          category +
          " result.",
      } satisfies Issue;
    });
}

function severityFor(score: number, weight: number): Severity {
  if (score === 0 && weight >= 7) {
    return "high";
  }

  if (score <= 0.5 || weight >= 5) {
    return "medium";
  }

  return "low";
}

function cleanLighthouseText(value: string | undefined) {
  if (!value) {
    return "The rendered mobile page failed this Lighthouse audit.";
  }

  return value
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

function measuredIssueId(auditId: string, auditName: string) {
  return (
    "issue_lh_" +
    createHash("sha1")
      .update(auditId + ":" + auditName)
      .digest("hex")
      .slice(0, 12)
  );
}

function compareIssues(left: Issue, right: Issue) {
  const rank: Record<Severity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return rank[left.severity] - rank[right.severity] || left.title.localeCompare(right.title);
}
