# Mend

Mend is an agent-native website repair workspace. It turns a website audit into
a shared human and agent workflow: scan, understand, propose, approve, fix, and
verify.

The project is being built for the OpenAI WebMCP Challenge. The current
checkpoint is Phase 3: a polished, responsive UI backed by a bounded server-side
audit pipeline and five feature-detected WebMCP read-only tools. Source
integration and repository writes are intentionally not enabled yet.

## Live demo

https://mend-webmcp.vercel.app/

## Why Mend

Website owners have tools that report accessibility and performance issues, and
developers have tools that can edit source code. The difficult part is the
handoff between those systems. Mend keeps evidence, source hints, proposed
diffs, approval, and verification in one workspace.

WebMCP adds a structured agent control plane to the same human UI. An agent can
call compact tools to scan a site, retrieve a summary, filter issues, inspect
evidence, and compare two audits. A tool-triggered scan updates the visible
dashboard immediately, so the agent and human operate on the same state. The
human will still approve every source-changing action in later phases.

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
- Draft patch review modal that makes the approval boundary visible without
  mutating a repository.
- Imperative WebMCP registration through `document.modelContext` with feature
  detection, abortable component lifecycle cleanup, and a visible registered
  tool status panel.
- Compact WebMCP responses backed by the same audit API as the human UI,
  including issue inspection and before/after comparison.
- Activity timeline, loading states, recoverable errors, and mobile layouts.

## Run locally

Requirements:

- Node.js 20 or newer
- npm

Install dependencies and start the development server:

    npm install
    npm run dev

Open http://localhost:3000, choose Try the deterministic demo workspace, and
select Scan site. You can also enter a public HTTPS URL to run the real
server-side audit pipeline.

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
    components/
      dashboard-page.tsx       Interactive audit workspace
      icons.tsx                Small inline SVG icon set
      landing-page.tsx         Landing and demo entry point
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
        tools.ts               Five audit tool implementations
        types.ts               Local WebMCP TypeScript contract
      demo-data.ts             Controlled demo audit
      types.ts                 Stable domain model
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

`scan_site` creates an in-memory audit record but does not change the target
site, so it is explicitly annotated as non-read-only. The other four tools are
read-only and return bounded JSON designed for agent reasoning. Proposed fixes
and repository writes will be separate tools. Any mutating tool will require an
approval state recorded by the human-facing UI, and source changes will be
branch-first rather than direct changes to main.

## Environment

The environment template is .env.example. No environment variables are
required for the Phase 3 audit pipeline or WebMCP tools. Future phases may use the following
values:

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
uses request timeouts. Future source flows will keep tokens server-side,
validate patch paths, require explicit human approval, and preserve a reversible
branch-based change path.

The Phase 3 server store is intentionally in-memory and suitable for the
controlled demo only. After `scan_site`, the browser keeps the most recent 12
audits in a bounded session cache so the same-page tool chain remains reliable
across serverless requests. A full reload still loses non-demo audit history.
Durable persistence will be added only if it improves the judging workflow.

## WebMCP local testing

Use a WebMCP-capable browser. Chrome local testing requires the WebMCP testing
flag at:

    chrome://flags/#enable-webmcp-testing

Then:

1. Start Mend with `npm run dev`.
2. Open `http://localhost:3000/dashboard?site=https://demo.mend.local` in the
   WebMCP-enabled browser.
3. Confirm the dashboard status card changes from Checking to Ready and lists
   the five registered tool names.
4. Ask the connected agent to call `scan_site` for `https://demo.mend.local`.
5. Use the returned `auditId` with `get_audit_summary` and `list_issues`.
6. Pass an issue ID from `list_issues` to `inspect_issue`.
7. Run a second scan and pass both IDs to `compare_audits`.

Browsers without WebMCP still support manual scanning and issue inspection; the
status card reports that the agent control plane is unavailable. Final judging
validation will use the deployed HTTPS URL, not only localhost.

## License

Mend is released under the MIT License. See LICENSE.
