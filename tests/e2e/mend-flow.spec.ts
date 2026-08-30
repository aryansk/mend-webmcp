import { expect, test, type Page } from "@playwright/test";

type ToolResult = Record<string, unknown>;

async function installWebMcpRuntime(page: Page) {
  await page.addInitScript(() => {
    const registered = new Map<
      string,
      { name: string; execute: (input: unknown) => Promise<unknown> }
    >();

    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        async registerTool(
          tool: { name: string; execute: (input: unknown) => Promise<unknown> },
          options?: { signal?: AbortSignal },
        ) {
          registered.set(tool.name, tool);
          options?.signal?.addEventListener(
            "abort",
            () => registered.delete(tool.name),
            { once: true },
          );
        },
      },
    });

    Object.defineProperty(window, "__mendTestWebMcp", {
      configurable: true,
      value: {
        names: () => Array.from(registered.keys()),
        call: (name: string, input: unknown) => {
          const tool = registered.get(name);

          if (!tool) {
            throw new Error("Tool is not registered: " + name);
          }

          // Deliberately omit the optional execution context. This mirrors the
          // production runtime that exposed the compatibility regression.
          return tool.execute(input);
        },
      },
    });
  });
}

async function callTool(page: Page, name: string, input: unknown) {
  return page.evaluate(
    async ({ toolName, toolInput }) => {
      const runtime = (
        window as typeof window & {
          __mendTestWebMcp: {
            call: (name: string, input: unknown) => Promise<ToolResult>;
          };
        }
      ).__mendTestWebMcp;

      return runtime.call(toolName, toolInput);
    },
    { toolName: name, toolInput: input },
  );
}

test("WebMCP drives the full approval-gated repair story", async ({ page }) => {
  await installWebMcpRuntime(page);
  await page.goto("/dashboard?site=https%3A%2F%2Fdemo.mend.local%2F");

  await expect(page.getByText("13 tools registered")).toBeVisible();

  const scan = await callTool(page, "scan_site", {
    url: "https://demo.mend.local",
    categories: ["accessibility", "performance", "seo", "link"],
  });
  const auditId = scan.auditId as string;
  const summary = await callTool(page, "get_audit_summary", { auditId });

  expect(summary).toMatchObject({ auditId, issueCount: 6 });

  await page.getByRole("button", { name: "Connect demo repo" }).click();
  await expect(page.getByRole("button", { name: "Source connected" })).toBeVisible();

  const proposal = await callTool(page, "propose_fix", {
    repositoryId: "repo_demo_001",
    issueIds: ["issue_img_alt"],
    constraints: ["do not change visual design", "do not change navigation"],
  });
  const fixId = proposal.fixId as string;

  await callTool(page, "request_fix_approval", { fixId });
  await expect(page.getByRole("dialog", { name: "Review proposed fix" })).toBeVisible();
  await page.getByRole("button", { name: "Approve patch" }).click();
  await expect(page.getByRole("button", { name: "Apply approved patch" })).toBeVisible();

  const applied = await callTool(page, "apply_approved_fix", { fixId });
  expect(applied).toMatchObject({ applied: true, baseBranch: "main" });

  const verification = await callTool(page, "verify_fix", { fixId });
  expect(verification).toMatchObject({
    verified: true,
    mode: "source_snapshot",
    resolvedIssueIds: ["issue_img_alt"],
    regressions: [],
  });

  const comparison = await callTool(page, "compare_audits", {
    beforeAuditId: verification.beforeAuditId,
    afterAuditId: verification.afterAuditId,
  });
  expect(comparison).toMatchObject({
    resolvedIssueIds: ["issue_img_alt"],
    regressions: [],
  });

  await expect(page.getByRole("heading", { name: "Fix verified" })).toBeVisible();
  await expect(page.getByText("74 → 89")).toBeVisible();
});

test("approval dialog manages focus and closes with Escape", async ({ page }) => {
  await page.goto("/dashboard?site=https%3A%2F%2Fdemo.mend.local%2F");
  await page.getByRole("button", { name: "Connect demo repo" }).click();
  await page.getByRole("button", { name: "Propose safe fix" }).click();

  const dialog = page.getByRole("dialog", { name: "Review proposed fix" });
  await expect(dialog).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "Propose safe fix" })).toBeFocused();
});

test("approved workspace survives a browser reload", async ({ page }) => {
  await installWebMcpRuntime(page);
  await page.goto("/dashboard?site=https%3A%2F%2Fdemo.mend.local%2F");
  await page.getByRole("button", { name: "Connect demo repo" }).click();

  const proposal = await callTool(page, "propose_fix", {
    repositoryId: "repo_demo_001",
    issueIds: ["issue_img_alt"],
    constraints: ["do not change visual design"],
  });
  const fixId = proposal.fixId as string;

  await callTool(page, "request_fix_approval", { fixId });
  await page.getByRole("button", { name: "Approve patch" }).click();
  await expect(page.getByRole("button", { name: "Apply approved patch" })).toBeVisible();

  await page.reload();

  await expect(page.getByText("13 tools registered")).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Review proposed fix" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Apply approved patch" })).toBeVisible();
  await expect(page.getByText("Restored the latest workspace state from this browser.")).toBeVisible();

  const applied = await callTool(page, "apply_approved_fix", { fixId });
  expect(applied).toMatchObject({ applied: true, baseBranch: "main" });
});

test("mobile issue selection opens a focused detail sheet", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard?site=https%3A%2F%2Fdemo.mend.local%2F");

  await page
    .getByRole("button", { name: /Email field has no associated label/ })
    .click();
  await expect(page.getByRole("button", { name: "Back to issues" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Email field has no associated label" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Back to issues" }).click();
  await expect(page.getByRole("button", { name: "Back to issues" })).toBeHidden();
});

test("unmapped live findings cannot offer demo source repairs", async ({ page }) => {
  await page.goto("/dashboard?site=https%3A%2F%2Fdemo.mend.local%2F");
  await page.getByRole("button", { name: "Connect demo repo" }).click();

  await page.route("**/api/audits", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    await route.fulfill({
      contentType: "application/json",
      status: 201,
      body: JSON.stringify({
        audit: {
          id: "audit_live_unmapped",
          siteUrl: "https://example.com/",
          createdAt: new Date().toISOString(),
          scores: { performance: 91, accessibility: 100, seo: 100 },
          brokenLinks: 0,
          checkedLinks: 3,
          scanMode: "lighthouse_mobile",
          scanProvider: "google_pagespeed",
          issues: [
            {
              id: "issue_live_fcp",
              auditId: "audit_live_unmapped",
              category: "performance",
              severity: "medium",
              title: "First Contentful Paint",
              description: "Rendered performance needs review.",
              pageUrl: "https://example.com/",
              evidence: "2.0 s",
              estimatedImpact: "Improve the rendered performance result.",
            },
          ],
        },
      }),
    });
  });

  await page.getByRole("button", { name: "Rescan site" }).click();

  await expect(page.getByText("No verified source match for this finding")).toBeVisible();
  await expect(page.getByRole("button", { name: "No source match" })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "No mapped fix available" }),
  ).toBeDisabled();
});
