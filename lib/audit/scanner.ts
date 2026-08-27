import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import { createHash } from "node:crypto";
import { analyzeDocument } from "./analyzers";
import { AuditError } from "./errors";
import { fetchDocument, probeResource } from "./fetch";
import { saveAudit } from "./store";
import {
  assertSafeTarget,
  isDemoTarget,
  normalizeTargetUrl,
} from "./url-safety";
import { demoAudit } from "../demo-data";
import type { Audit, AuditCategory } from "../types";
import { enrichAuditWithPageSpeed } from "./pagespeed";

export const allAuditCategories: AuditCategory[] = [
  "accessibility",
  "performance",
  "seo",
  "link",
];

export async function runAuditForUrl(
  input: unknown,
  requestedCategories?: unknown,
): Promise<Audit> {
  const targetUrl = normalizeTargetUrl(input);
  const categories = normalizeCategories(requestedCategories);

  if (isDemoTarget(targetUrl)) {
    return saveAudit(createDemoAudit(targetUrl, categories));
  }

  await assertSafeTarget(targetUrl);
  const fetched = await fetchDocument(targetUrl);
  const pageUrl = fetched.finalUrl;
  const $ = cheerio.load(fetched.html);

  const linkTargets = categories.includes("link")
    ? collectSameOriginTargets($, "a[href]", pageUrl)
    : [];
  const imageTargets = categories.includes("performance")
    ? collectSameOriginTargets($, "img[src]", pageUrl)
    : [];

  const [linkResults, imageResources] = await Promise.all([
    probeLinks(linkTargets),
    probeImages(imageTargets),
  ]);

  const auditId = createAuditId(pageUrl);
  const analysis = analyzeDocument({
    auditId,
    pageUrl,
    html: fetched.html,
    responseBytes: fetched.responseBytes,
    responseTimeMs: fetched.responseTimeMs,
    categories: new Set(categories),
    imageResources,
    linkResults,
  });

  const staticAudit: Audit = {
    id: auditId,
    siteUrl: targetUrl.toString(),
    createdAt: new Date().toISOString(),
    scores: analysis.scores,
    brokenLinks: analysis.brokenLinks,
    issues: analysis.issues,
    finalUrl: pageUrl,
    responseBytes: fetched.responseBytes,
    responseTimeMs: fetched.responseTimeMs,
    checkedLinks: linkResults.length,
    scanMode: "static_html",
    scanProvider: "mend",
  };

  return saveAudit(await enrichAuditWithPageSpeed(staticAudit, categories));
}

export function normalizeCategories(input: unknown): AuditCategory[] {
  if (!Array.isArray(input)) {
    return [...allAuditCategories];
  }

  const requested = input.filter(isAuditCategory);
  return requested.length > 0
    ? Array.from(new Set(requested))
    : [...allAuditCategories];
}

function isAuditCategory(value: unknown): value is AuditCategory {
  return (
    value === "accessibility" ||
    value === "performance" ||
    value === "seo" ||
    value === "link"
  );
}

function createDemoAudit(targetUrl: URL, categories: AuditCategory[]): Audit {
  const issues = demoAudit.issues
    .filter((issue) => categories.includes(issue.category))
    .map((issue) => ({
      ...issue,
      auditId: demoAudit.id,
      pageUrl: issue.pageUrl.replace("https://demo.mend.local", targetUrl.origin),
    }));

  return {
    ...demoAudit,
    siteUrl: targetUrl.toString(),
    createdAt: new Date().toISOString(),
    scores: {
      performance: categories.includes("performance")
        ? demoAudit.scores.performance
        : undefined,
      accessibility: categories.includes("accessibility")
        ? demoAudit.scores.accessibility
        : undefined,
      seo: categories.includes("seo") ? demoAudit.scores.seo : undefined,
    },
    brokenLinks: categories.includes("link") ? demoAudit.brokenLinks : 0,
    issues,
  };
}

function createAuditId(pageUrl: string) {
  const digest = createHash("sha1")
    .update(pageUrl + ":" + Date.now() + ":" + Math.random())
    .digest("hex")
    .slice(0, 10);

  return "audit_" + Date.now().toString(36) + "_" + digest;
}

function collectSameOriginTargets(
  $: CheerioAPI,
  selector: string,
  pageUrl: string,
) {
  const baseUrl = new URL(pageUrl);
  const targets = new Map<string, URL>();

  $(selector).each((_, element) => {
    const attribute = selector.startsWith("a")
      ? $(element).attr("href")
      : $(element).attr("src");

    if (!attribute || /^(#|data:|mailto:|tel:|javascript:)/i.test(attribute.trim())) {
      return;
    }

    try {
      const target = new URL(attribute, baseUrl);
      target.hash = "";

      if (
        !["http:", "https:"].includes(target.protocol) ||
        target.origin !== baseUrl.origin ||
        target.toString() === baseUrl.toString()
      ) {
        return;
      }

      targets.set(target.toString(), target);
    } catch {
      // Invalid href/src values become issues only when they are actionable.
    }
  });

  return Array.from(targets.values()).slice(0, selector.startsWith("a") ? 20 : 8);
}

async function probeLinks(targets: URL[]) {
  return mapWithConcurrency(targets, 4, async (target) => {
    let result = await probeResource(target, { method: "HEAD" });

    if (result.status === 405) {
      result = await probeResource(target, {
        headers: { Range: "bytes=0-0" },
        method: "GET",
      });
    }

    return result;
  });
}

async function probeImages(targets: URL[]) {
  return mapWithConcurrency(targets, 3, (target) =>
    probeResource(target, { method: "HEAD" }),
  );
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
) {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );

  return results;
}
