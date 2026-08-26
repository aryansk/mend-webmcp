# Mend

Mend is an agent-native website repair workspace. It turns a website audit into
a shared human and agent workflow: scan, understand, propose, approve, fix, and
verify.

The project is being built for the OpenAI WebMCP Challenge. The current
checkpoint is Phase 6: a polished, responsive UI backed by a bounded server-side
audit pipeline, twelve feature-detected WebMCP tools, a connected controlled
repository source viewer, and a branch-first approved-fix flow. The controlled
demo records an isolated branch snapshot while keeping its checked-in main
fixture unchanged.

## Live demo

https://mend-webmcp.vercel.app/

## Why Mend

Website owners have tools that report accessibility and performance issues, and
developers have tools that can edit source code. The difficult part is the
handoff between those systems. Mend keeps evidence, source hints, proposed
diffs, approval, and verification in one workspace.

WebMCP adds a structured agent control plane to the same human UI. An agent can
call compact tools to scan a site, retrieve a summary, filter issues, inspect
evidence, compare audits, read mapped source context, generate an exact diff,
and request human approval. After approval, the agent can create an isolated
branch snapshot without editing main. Tool-triggered scans, fix proposals, and
branch records update the visible dashboard immediately, so the agent and human
operate on the same state. The human still approves every source-changing
action.

## Current UI

- Landing page with URL validation and a deterministic demo entry point.
- Responsive audit dashboard with live performance, accessibility, SEO, and
  broken link score cards.
- Prioritized issue list with severity, category, page, evidence, and source
  confidence.
- Server-side HTML checks for missing alt text, unlabeled controls, heading
  hierarchy, blocking scripts, image dimensions, oversized image assets,
  metadata, and same-origin links.
- SSRF protections, redirect limits, response-size limits, fetch timeouts, and
  bounded resource probes.
- Deterministic patch generator for the controlled demo issues, with full
  original/proposed source and unified diffs.
- Patch review modal that records waiting, approved, and rejected states without
  mutating a repository.
- Branch-first apply action that verifies approval, validates the original
  source context, and records a demo branch and commit without changing main.
- Imperative WebMCP registration through `document.modelContext` with feature
  detection, abortable component lifecycle cleanup, and a visible registered
  tool status panel.
- Compact WebMCP responses backed by the same audit API as the human UI,
  including issue inspection and before/after comparison.
- Controlled demo repository connection with server-side file listing, safe
  relative-path validation, source-hint verification, and a read-only source
  viewer with highlighted mapped lines.
- Activity timeline, loading states, recoverable errors, and mobile layouts.

## Run locally

Requirements:

- Node.js 20 or newer
- npm

Install dependencies and start the development server:

    npm install
    npm run dev

Open http://localhost:3000, choose Try the deterministic demo workspace, and
select Scan site. On the dashboard, choose Connect demo repo, select an issue,
and choose Inspect source to open the checked-in source context. Choose Propose
safe fix, review the exact diff, approve it, and choose Apply approved patch to
create the isolated demo branch record. You can also enter a public HTTPS URL
to run the real server-side audit pipeline.

Validation commands:

    npm run lint
    npm run typecheck
    npm run test
    npm run build

## Project structure

    app/
      dashboard/page.tsx       Dashboard route
      error.tsx                Recoverable route error
      globals.css              Design tokens and responsive UI
      layout.tsx               Metadata and root layout
      page.tsx                 Landing route
    app/api/audits/
      route.ts                 Audit API for scans and stored summaries
    app/api/repositories/
      route.ts                 Controlled repository connection API
      files/route.ts            Safe file listing and reads
      source/route.ts           Issue-to-source resolution
    app/api/fixes/
      route.ts                 Deterministic proposal and diff API
      approval/route.ts          Human approval request API
      decision/route.ts          Explicit approve/reject API
      apply/route.ts             Branch-first approved-fix API
    components/
      dashboard-page.tsx       Interactive audit workspace
      icons.tsx                Small inline SVG icon set
      landing-page.tsx         Landing and demo entry point
      source-viewer.tsx        Read-only mapped source viewer
    lib/
      audit/
        analyzers.ts           HTML issue normalization and score calculation
        fetch.ts               Bounded safe fetch and resource probing
        scanner.ts             Audit orchestration and demo handling
        summary.ts             Compact audit summary helpers
        store.ts               Lightweight in-memory audit store
        url-safety.ts          URL validation and SSRF protections
        compare.ts             Before/after issue and score comparison
      webmcp/
        api.ts                 Browser client for audit tool requests
        feature-detect.ts      document.modelContext detection
        register-tools.ts      Abortable tool registration lifecycle
        tool-schemas.ts        Compact JSON schemas and annotations
        tools.ts               Audit and repository tool implementations
        types.ts               Local WebMCP TypeScript contract
      fixes/
        apply.ts                Approval guard and branch snapshot store
        diff.ts                Bounded unified diff generation
        generator.ts           Controlled source patch plans
        service.ts             Proposal and approval state helpers
        store.ts               Lightweight in-memory fix store
        errors.ts              Fix validation errors
      repository/
        demo.ts                Controlled repository definition
        files.ts               Bounded server-side file access
        mapping.ts             Issue-to-source validation
        store.ts               Lightweight connection store
        types.ts               Repository domain types
      demo-data.ts             Controlled demo audit
      types.ts                 Stable domain model
    demo-repo/
      ...                       Checked-in intentional issue source
    tests/unit/
      analyzers.test.ts        Fixture coverage for normalized findings
      summary.test.ts          Unit coverage for audit summaries
      url-safety.test.ts       Private-target and URL validation coverage
    tests/integration/
      audits-route.test.ts     API and category-filter coverage

## WebMCP tool surface

The dashboard registers these tools with `document.modelContext` when the
browser exposes the imperative WebMCP API. `navigator.modelContext` is not
used. Registration is tied to the dashboard lifecycle with an `AbortController`
so stale tools are removed when the component unmounts.

- scan_site
- get_audit_summary
- list_issues
- inspect_issue
- compare_audits
- get_repository_status
- list_repository_files
- inspect_source
- propose_fix
- get_fix_diff
- request_fix_approval
- apply_approved_fix

`scan_site`, `propose_fix`, `request_fix_approval`, and `apply_approved_fix`
update Mend workspace state, so they are explicitly annotated as non-read-only.
`apply_approved_fix` verifies both approval status and source context before
creating a controlled-demo branch snapshot; it never edits main. The remaining
tools are read-only and return bounded JSON designed for agent reasoning. The
repository and fix tools expose only the connected demo repository and never
return credentials. GitHub OAuth, real remote commits, and pull requests remain
future integration work.

## Environment

The environment template is .env.example. No environment variables are
required for the Phase 6 audit pipeline, demo repository, or WebMCP tools.
Future GitHub OAuth phases may use the following values:

- NEXT_PUBLIC_APP_URL
- GITHUB_CLIENT_ID
- GITHUB_CLIENT_SECRET
- GITHUB_APP_ID
- GITHUB_PRIVATE_KEY
- DATABASE_URL
- OPENAI_API_KEY

Never commit real credentials.

## Safety model

Mend treats scanned pages and repository text as untrusted input. The audit
pipeline validates URLs, blocks private-network targets and DNS results,
manually validates redirects, bounds fetched content and resource probes, and
uses request timeouts. The repository connector permits only known demo files,
validates relative paths, bounds source reads, keeps all repository access on
the server, and returns no tokens to the browser. Future remote source writes
will require explicit human approval and preserve a reversible branch-based
change path.

The Phase 6 server stores for audits, repositories, proposed fixes, and demo
branch snapshots are intentionally in-memory and suitable for the controlled
demo only. After
`scan_site` and `propose_fix`, the browser keeps bounded same-page caches so the
agent can continue from the exact state visible to the human across serverless
requests. A full reload loses stored audit, fix, and branch history; the
deterministic demo data can be rebuilt, but branch snapshots cannot.
Durable persistence and real GitHub branches will be added only if they improve
the judging workflow.

## WebMCP local testing

Use a WebMCP-capable browser. Chrome local testing requires the WebMCP testing
flag at:

    chrome://flags/#enable-webmcp-testing

Then:

1. Start Mend with `npm run dev`.
2. Open `http://localhost:3000/dashboard?site=https://demo.mend.local` in the
   WebMCP-enabled browser.
3. Confirm the dashboard status card changes from Checking to Ready and lists
   the twelve registered tool names.
4. Ask the connected agent to call `scan_site` for `https://demo.mend.local`.
5. Use the returned `auditId` with `get_audit_summary` and `list_issues`.
6. Pass an issue ID from `list_issues` to `inspect_issue`.
7. Click Connect demo repo in Mend and verify the repository card shows
   `mend/demo-site` on `main`.
8. Ask the agent to call `get_repository_status`, `list_repository_files`, and
   `inspect_source` with `repo_demo_001` and an issue ID.
9. Ask the agent to call `propose_fix` with `repo_demo_001` and
   `issue_img_alt`, keeping the constraints about visual design and navigation.
10. Ask the agent to call `get_fix_diff`, then `request_fix_approval` with the
    returned fix ID.
11. Review the exact diff in Mend and click Approve patch or Reject patch.
    Confirm the activity log records the human decision.
12. After approval, click Apply approved patch or ask the agent to call
    `apply_approved_fix`. Confirm Mend shows a `mend/fix/...` branch, a commit
    record, and that main source still contains the original issue.
13. Run a second scan and pass both IDs to `compare_audits`.

Browsers without WebMCP still support manual scanning and issue inspection; the
status card reports that the agent control plane is unavailable. Final judging
validation will use the deployed HTTPS URL, not only localhost.

## License

Mend is released under the MIT License. See LICENSE.
