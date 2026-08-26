# Mend

Mend is an agent-native website repair workspace. It turns a website audit into
a shared human and agent workflow: scan, understand, propose, approve, fix, and
verify.

The project is being built for the OpenAI WebMCP Challenge. The current
checkpoint is Phase 2: a polished, responsive UI backed by a bounded server-side
audit pipeline. WebMCP registration, source integration, and repository writes
are intentionally not enabled yet.

## Live demo

https://mend-webmcp.vercel.app/

## Why Mend

Website owners have tools that report accessibility and performance issues, and
developers have tools that can edit source code. The difficult part is the
handoff between those systems. Mend keeps evidence, source hints, proposed
diffs, approval, and verification in one workspace.

WebMCP will add a structured agent control plane to the same human UI. An agent
will be able to call compact tools such as scan_site, list_issues,
inspect_issue, propose_fix, and verify_fix. The human will still approve every
source-changing action.

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
      demo-data.ts             Controlled demo audit
      types.ts                 Stable domain model
    tests/unit/
      analyzers.test.ts        Fixture coverage for normalized findings
      summary.test.ts          Unit coverage for audit summaries
      url-safety.test.ts       Private-target and URL validation coverage
    tests/integration/
      audits-route.test.ts     API and category-filter coverage

## Planned WebMCP surface

WebMCP registration begins in Phase 3 and will use document.modelContext with
feature detection. The planned read-only tools are:

- scan_site
- get_audit_summary
- list_issues
- inspect_issue
- compare_audits

Proposed fixes and repository writes will be separate tools. Any mutating tool
will require an approval state recorded by the human-facing UI, and source
changes will be branch-first rather than direct changes to main.

## Environment

The environment template is .env.example. No environment variables are
required for the Phase 2 audit pipeline. Future phases may use the following
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

The Phase 2 store is intentionally in-memory and suitable for the controlled
demo only. Durable persistence will be added only if it improves the judging
workflow.

## WebMCP local testing

When the WebMCP layer is implemented, use a WebMCP-capable browser. Chrome
local testing requires the WebMCP testing flag at:

    chrome://flags/#enable-webmcp-testing

Final judging validation will use the deployed HTTPS URL, not only localhost.

## License

Mend is released under the MIT License. See LICENSE.
