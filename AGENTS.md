# AGENTS.md — Mend: WebMCP Website Repair Agent

> **Purpose:** This file is the source of truth for Codex while building the OpenAI WebMCP Challenge submission.
>
> **Project working name:** Mend  
> **One-line pitch:** Scan a website, explain what is wrong, generate a safe source-code fix, let the human approve it, and verify the improvement — with the whole workflow exposed to an AI agent through WebMCP.
>
> **Core loop:** **Scan → Understand → Propose → Approve → Fix → Verify**

---

# 0. Codex instructions

When working in this repository:

1. Read this entire file before making architectural changes.
2. Prefer a small, polished, working MVP over a broad unfinished product.
3. Keep the WebMCP interaction central. Do not turn this into a generic chatbot or generic Lighthouse clone.
4. Use `document.modelContext`, not `navigator.modelContext`, for WebMCP.
5. Feature-detect WebMCP so the site still renders normally in browsers without it.
6. Every mutating tool must require an explicit human confirmation step in the UI before destructive/source-changing actions.
7. Do not silently commit directly to `main`. Create a branch/patch/PR flow for source changes.
8. Keep every tool's input/output JSON small, deterministic, and easy for an agent to reason about.
9. After each implementation phase:
   - run lint/typecheck
   - run unit tests
   - manually test the primary flow
   - update `README.md` if setup changes
10. Do not claim a feature works unless it has actually been tested.
11. Preserve a clear commit history because the hackathon rules may rely on dated commits as evidence of work created during the submission period.
12. Before submission, freeze the submitted branch, live site, repo, and Devpost submission. Do not change the submitted version during judging.

---

# 1. Hackathon facts to work against

## Official project requirement

Build a **WebMCP-powered web app** where humans and agents can interact, collaborate, and create together.

## Submission deadline

Use the stricter deadline published in the Devpost official rules:

**September 3, 2026 at 1:00 PM Pacific Time**  
**September 4, 2026 at 1:30 AM India Standard Time**

Target an internal finish at least several hours earlier.

## Required submission material

The final Devpost submission needs:

- A **working live URL** accessible to judges.
- A **text description** explaining:
  - why this use case is a strong fit for WebMCP
  - how it creates a better UX
  - what humans + agents can do together that was difficult/impossible before
  - how WebMCP was implemented
- A **public code repository** on GitHub, GitLab, or Bitbucket.
- The repository must contain:
  - all source code/assets needed to run
  - setup instructions
  - an **open-source license**
- A **public YouTube demo video under 3 minutes**.
- The video must contain:
  - a clear working demo
  - audio explaining the project
  - how WebMCP is used
- The live project must remain available to judges during judging.

If authentication is required, provide test credentials in the Devpost testing instructions.

## Judging mindset

Optimize for:

- thoughtful WebMCP usage
- usefulness
- originality
- execution quality
- quality of the human-agent collaboration

The demo should make it obvious that WebMCP is not decorative. The agent should be able to accomplish a multi-step workflow using the structured tools exposed by the site.

---

# 2. Product definition

## Problem

Website owners can run Lighthouse, accessibility audits, SEO scanners, or ask an AI coding assistant to fix code — but these are usually disconnected workflows.

A developer often has to:

1. run an audit
2. interpret dozens of issues
3. find which source file caused the issue
4. decide whether a fix is safe
5. modify code
6. deploy
7. run the audit again
8. compare the result

Mend turns this into a single human + agent workflow.

## User story

A user connects a website and its source repository.

They ask their agent:

> "Fix the high-impact accessibility and performance issues without changing the visual design."

The agent uses Mend's WebMCP tools to:

1. scan the site
2. retrieve prioritized issues
3. inspect individual issues
4. locate related source files
5. generate proposed patches
6. show the human the diff
7. apply only approved fixes
8. deploy or analyze a preview
9. re-run checks
10. compare before vs. after

The human remains in control of source-changing actions.

---

# 3. MVP scope

Build these four things extremely well:

1. **Accessibility audit**
2. **Performance audit**
3. **Agent-generated proposed fixes**
4. **Before/after verification**

Secondary features, only after the above works:

- SEO checks
- broken links
- mobile/responsive checks

Do **not** spend MVP time on:

- full security scanner
- full Ahrefs/Semrush replacement
- huge analytics suite
- multi-cloud deployment orchestration
- billing
- organizations/teams
- complicated RBAC
- custom model hosting
- a generic chat UI

---

# 4. Recommended demo scope

For reliability, build and test the hackathon demo around a **controlled demo repository** that contains intentional problems.

Example intentional problems:

- hero image is unnecessarily large
- missing image dimensions
- missing `alt`
- form input missing label
- low semantic heading quality
- broken internal link
- render-blocking script
- unused JS/CSS
- missing metadata
- poor button accessible name

The app should still support arbitrary public URLs for scanning, but the source-code repair flow only needs to be rock-solid for repositories the user has connected and authorized.

This gives the demo a deterministic before → fix → after story.

---

# 5. Recommended stack

Use a boring, fast-to-ship stack.

## Frontend

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- shadcn/ui or a similarly lightweight component system

## Backend

- Next.js route handlers/server actions where sensible
- Postgres only if persistence becomes necessary
- Otherwise begin with a lightweight persistence layer or local/demo data
- Keep the first version stateless where possible

## Hosting

Preferred:

- **Vercel**

Also acceptable:

- Cloudflare
- Netlify
- Render
- ChatGPT Sites
- any host that serves a reliable HTTPS app

## Website analysis

Prefer existing standards/tools instead of reinventing them:

- Lighthouse/PageSpeed-style metrics where practical
- axe-core for accessibility checks
- custom lightweight link/metadata checks

Avoid making external API availability a single point of failure in the demo.

## GitHub

For the polished version:

- GitHub OAuth or GitHub App
- Octokit
- request only the minimum repository permissions needed
- create a branch
- commit approved changes to the branch
- optionally create a PR

For the earliest MVP:

- allow scanning without GitHub
- use a connected test/demo repo for the source-patch flow

---

# 6. Suggested repository layout

```text
mend/
├── AGENTS.md
├── README.md
├── LICENSE
├── package.json
├── .env.example
├── app/
│   ├── page.tsx
│   ├── dashboard/
│   │   └── page.tsx
│   ├── api/
│   │   ├── audits/
│   │   ├── fixes/
│   │   ├── github/
│   │   └── verify/
│   └── ...
├── components/
│   ├── audit/
│   ├── diff/
│   ├── score/
│   └── webmcp/
├── lib/
│   ├── audit/
│   │   ├── accessibility.ts
│   │   ├── performance.ts
│   │   ├── seo.ts
│   │   └── links.ts
│   ├── github/
│   ├── fixes/
│   ├── verification/
│   └── webmcp/
│       ├── register-tools.ts
│       ├── tool-types.ts
│       └── feature-detect.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── demo-site/
    └── ...
```

---

# 7. Main UI

## Landing page

Keep it extremely simple:

- Product name: Mend
- One-line explanation
- URL input
- "Scan site" CTA
- "Connect GitHub" secondary CTA

## Audit dashboard

Header:

- site URL
- latest scan timestamp
- GitHub repo/branch if connected
- Rescan button

Four primary score cards:

- Performance
- Accessibility
- SEO
- Broken links

Main issue list:

- severity
- category
- title
- page
- confidence
- "Inspect"
- "Propose fix"

## Issue detail drawer/page

Show:

- what the problem is
- why it matters
- evidence
- affected element/file if known
- estimated impact
- proposed remediation
- related source code
- "Generate patch"

## Diff approval view

Show:

- file path
- before
- after
- explanation
- expected effect
- Accept / Reject

No source mutation should happen until approval.

## Verification view

Show before/after metrics prominently:

```text
Performance       61 → 91
Accessibility     74 → 98
SEO               82 → 94
Broken links       7 → 0
```

Also list:

- fixes applied
- remaining issues
- regressions, if any

---

# 8. Data model

Keep the domain model straightforward.

```ts
type Audit = {
  id: string;
  siteUrl: string;
  createdAt: string;
  scores: {
    performance?: number;
    accessibility?: number;
    seo?: number;
  };
  brokenLinks: number;
  issues: Issue[];
};

type Issue = {
  id: string;
  auditId: string;
  category: "accessibility" | "performance" | "seo" | "link";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  pageUrl: string;
  selector?: string;
  sourceHint?: SourceHint;
  evidence?: unknown;
};

type SourceHint = {
  repo?: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  confidence: number;
};

type ProposedFix = {
  id: string;
  issueIds: string[];
  files: FilePatch[];
  explanation: string;
  expectedImpact: string[];
  status: "proposed" | "approved" | "rejected" | "applied" | "verified";
};

type FilePatch = {
  path: string;
  original: string;
  proposed: string;
  diff: string;
};
```

---

# 9. WebMCP design

WebMCP is the centerpiece of the hackathon submission.

Use the current imperative API:

```ts
document.modelContext.registerTool({
  name: "example_tool",
  description: "Explain clearly when and why an agent should use this tool.",
  inputSchema: {
    type: "object",
    properties: {}
  },
  annotations: {
    readOnlyHint: true
  },
  execute: async (input) => {
    return {};
  }
});
```

Feature detect first:

```ts
if (
  typeof document !== "undefined" &&
  "modelContext" in document &&
  document.modelContext
) {
  // register tools
}
```

For React, ensure tool registration follows component/page lifecycle. Use an `AbortController` or a well-maintained WebMCP React hook so stale tools do not remain registered after navigation.

---

# 10. WebMCP tool set

Do not expose dozens of tiny tools. Expose a small coherent API.

## Tool 1 — `scan_site`

**Purpose:** Run a new audit for a site.

Read/write: creates an audit record but does not modify the target site.

Input:

```json
{
  "url": "https://example.com",
  "categories": ["accessibility", "performance"]
}
```

Output:

```json
{
  "auditId": "audit_123",
  "scores": {
    "performance": 61,
    "accessibility": 74
  },
  "issueCount": 19,
  "highImpactIssueCount": 7
}
```

---

## Tool 2 — `get_audit_summary`

**Purpose:** Give the agent a compact view of the latest audit.

Annotation:

```ts
readOnlyHint: true
```

Input:

```json
{
  "auditId": "audit_123"
}
```

Output should be compact and prioritize what matters.

---

## Tool 3 — `list_issues`

**Purpose:** Retrieve issues filtered by severity/category.

Input:

```json
{
  "auditId": "audit_123",
  "category": "accessibility",
  "severity": ["critical", "high"],
  "limit": 20
}
```

---

## Tool 4 — `inspect_issue`

**Purpose:** Retrieve evidence and source hints for one issue.

Input:

```json
{
  "issueId": "issue_abc"
}
```

Output:

```json
{
  "issue": {},
  "evidence": {},
  "sourceHints": [
    {
      "path": "components/Hero.tsx",
      "confidence": 0.91
    }
  ]
}
```

---

## Tool 5 — `propose_fix`

**Purpose:** Generate a candidate source patch.

Important: this **must not** modify the repo.

Input:

```json
{
  "issueIds": ["issue_abc", "issue_def"],
  "constraints": [
    "do not change visual design",
    "do not change navigation"
  ]
}
```

Output:

```json
{
  "fixId": "fix_123",
  "status": "proposed",
  "filesChanged": 2,
  "requiresHumanApproval": true
}
```

The UI should immediately navigate/show the diff.

---

## Tool 6 — `get_fix_diff`

**Purpose:** Allow the agent to understand the proposed patch without applying it.

Read-only.

Input:

```json
{
  "fixId": "fix_123"
}
```

---

## Tool 7 — `request_fix_approval`

**Purpose:** Surface the proposed patch to the human and mark it as awaiting approval.

This tool does not apply the patch.

Output:

```json
{
  "fixId": "fix_123",
  "approvalStatus": "waiting_for_human"
}
```

The human uses the UI to accept/reject.

---

## Tool 8 — `apply_approved_fix`

**Purpose:** Apply a patch only after the UI records explicit approval.

Guardrail:

If the fix is not approved, return an error such as:

```json
{
  "ok": false,
  "reason": "human_approval_required"
}
```

On success:

- create a new branch
- commit the patch
- optionally create a PR

Never push directly to `main`.

---

## Tool 9 — `verify_fix`

**Purpose:** Re-run the relevant checks against the updated/deployed preview and determine whether the target issues were actually fixed.

Input:

```json
{
  "fixId": "fix_123",
  "previewUrl": "https://..."
}
```

Output:

```json
{
  "verified": true,
  "resolvedIssueIds": ["issue_abc", "issue_def"],
  "remainingIssueIds": [],
  "regressions": [],
  "before": {
    "performance": 61,
    "accessibility": 74
  },
  "after": {
    "performance": 91,
    "accessibility": 98
  }
}
```

---

## Tool 10 — `compare_audits`

**Purpose:** Generate the final before/after summary.

Read-only.

This is useful for both the agent and the demo.

---

# 11. Ideal agent interaction

The desired judging demo is something like:

### Human

> Scan this site and find the biggest accessibility and performance problems.

### Agent calls

1. `scan_site`
2. `get_audit_summary`
3. `list_issues`

### Agent

> I found 7 high-impact issues. The biggest are an oversized hero image, missing image dimensions, two unlabeled form controls, and a render-blocking script.

### Human

> Fix the safe ones without changing the design or navigation.

### Agent calls

4. `inspect_issue` as necessary
5. `propose_fix`

### Mend UI

Shows a source diff.

### Human

Clicks **Approve**.

### Agent calls

6. `apply_approved_fix`

### App

Creates patch branch / PR or updates controlled demo source.

### Agent calls

7. `verify_fix`
8. `compare_audits`

### Mend UI

Shows:

```text
Performance       61 → 91
Accessibility     74 → 98
Broken links       3 → 0
Regressions        0
```

That is the core hackathon story.

---

# 12. Implementation phases

## Phase 1 — Repo and UI shell

Goal: app runs locally and is deployed.

Tasks:

- initialize Next.js + TypeScript
- set up Tailwind/component system
- create landing page
- create dashboard shell
- set up error boundaries/loading states
- deploy immediately
- add `.env.example`
- add `README.md`
- add open-source `LICENSE`

Definition of done:

- live HTTPS URL loads
- URL input works
- dashboard can show mock audit data
- mobile layout is usable

---

## Phase 2 — Real website audit

Goal: replace mock scores with a working audit pipeline.

Implement:

- accessibility checks
- basic performance metrics
- basic SEO/metadata checks
- broken link checks

Normalize all scanner output into the `Issue` model.

Definition of done:

- user enters a URL
- Mend produces an audit
- issues display with category/severity
- repeated scan does not crash

---

## Phase 3 — WebMCP read-only tools

Goal: agent can inspect the same data visible to the human.

Implement:

- `scan_site`
- `get_audit_summary`
- `list_issues`
- `inspect_issue`
- `compare_audits`

Definition of done:

- tools are visible in a WebMCP-capable browser
- schemas validate
- agent can call them
- results correspond to what UI shows
- no duplicate/stale tools after route changes

---

## Phase 4 — Source repository integration

Goal: connect an authorized repo and map issues to source.

Implement:

- GitHub auth/app
- repository selection
- fetch relevant files
- source hints
- source file viewer

Keep mapping heuristic/simple for the demo if necessary.

Definition of done:

- connected demo repo can be read
- issue can point to a plausible source file
- secrets/tokens never reach client-side logs

---

## Phase 5 — Proposed fixes + approval

Goal: complete the human-in-control loop.

Implement:

- generate fix from issue + relevant source
- render diff
- approval state
- reject state
- `propose_fix`
- `get_fix_diff`
- `request_fix_approval`

Definition of done:

- agent can generate a patch
- user sees exact source change
- no code changes happen before approval

---

## Phase 6 — Apply patch

Goal: safely mutate source.

Implement:

- `apply_approved_fix`
- branch creation
- commit
- optional PR creation
- meaningful error messages

Definition of done:

- unapproved patch cannot be applied
- approved patch appears in GitHub branch/PR
- main branch remains untouched

---

## Phase 7 — Verification

Goal: prove fixes worked.

Implement:

- preview URL input/automatic preview lookup if practical
- re-audit
- issue matching
- regression detection
- before/after score cards
- `verify_fix`
- `compare_audits`

Definition of done:

- at least one deterministic demo issue moves from failing → passing
- before/after result is saved and rendered
- regressions are called out

---

## Phase 8 — Demo polish

Tasks:

- improve empty/loading/error states
- make tool-driven changes visibly reflected in UI
- add activity timeline:
  - scanned site
  - found issues
  - proposed patch
  - approved by human
  - branch created
  - verification passed
- make score changes visually obvious
- remove dead features
- seed a deterministic demo site
- prepare one-click reset for demo data if useful

---

# 13. Testing WebMCP

## Option A — ChatGPT in-app browser

The challenge says ChatGPT's in-app browser supports WebMCP out of the box.

Use the deployed HTTPS site.

Test prompts such as:

- "What tools does this page expose?"
- "Scan this site for accessibility problems."
- "Show me only the critical and high severity issues."
- "Propose fixes, but don't apply anything."
- "Apply the fix I approved."
- "Verify whether it actually improved the site."

Check that the agent invokes Mend tools rather than attempting to click around blindly.

## Option B — Chrome

Use Chrome 149+.

Open:

```text
chrome://flags/#enable-webmcp-testing
```

Enable it and relaunch Chrome.

Then open the deployed Mend app.

Use Chrome WebMCP debugging/inspection support to verify the registered tools and schemas.

## Local testing

Use localhost for normal development, but always perform final judging tests on the **deployed HTTPS URL**.

---

# 14. WebMCP-specific test checklist

For every registered tool:

- [ ] Tool appears only on routes where it makes sense
- [ ] Tool name is action-oriented and unique
- [ ] Description explains when an agent should use it
- [ ] JSON schema is valid
- [ ] Required parameters are actually required
- [ ] Invalid input produces a useful error
- [ ] Tool output is concise
- [ ] Read-only tools have `readOnlyHint: true`
- [ ] Mutating tools are clearly marked as non-read-only
- [ ] Tool does not leak tokens/secrets
- [ ] Tool handles cancelled/aborted execution
- [ ] Tool does not become duplicated after React rerenders/navigation
- [ ] The same action also has a comprehensible human UI
- [ ] State changed by the agent immediately appears in the UI
- [ ] Human changes in the UI are visible to subsequent tool calls

---

# 15. Functional test checklist

## Scanning

- [ ] Valid HTTPS URL scans
- [ ] Invalid URL is rejected
- [ ] Timeout is handled
- [ ] Redirect works
- [ ] unreachable site produces a readable error
- [ ] audit results are deterministic enough for demo

## Accessibility

- [ ] missing alt is detected
- [ ] unlabeled input is detected
- [ ] heading/semantic issue can be surfaced
- [ ] evidence points to correct page/element

## Performance

- [ ] oversized image issue can be surfaced
- [ ] at least one performance fix can be demonstrated
- [ ] before/after performance output is recorded

## GitHub

- [ ] authentication flow works
- [ ] repository selection works
- [ ] repo token is server-side only
- [ ] connected repo can be read
- [ ] branch creation works
- [ ] commit works
- [ ] direct main mutation is prevented
- [ ] failed GitHub API responses are handled

## Fixes

- [ ] patch can be generated
- [ ] patch can be previewed
- [ ] patch can be rejected
- [ ] patch cannot apply without approval
- [ ] approved patch can apply
- [ ] applied patch status updates in UI

## Verification

- [ ] site can be rescanned
- [ ] resolved issue is marked resolved
- [ ] unchanged issue remains
- [ ] regression is surfaced
- [ ] before/after comparison is correct

---

# 16. Automated tests

At minimum:

## Unit

Test:

- URL validation
- severity normalization
- audit normalization
- issue matching
- score comparison
- approval guards
- WebMCP schema builders

## Integration

Test:

- scan API returns normalized `Audit`
- proposal API does not mutate repository
- apply API rejects unapproved fix
- apply API accepts approved fix with mocked GitHub
- verify API calculates before/after correctly

## E2E

Use Playwright.

Critical test:

1. open site
2. scan demo URL
3. open high-impact issue
4. generate proposed patch
5. approve
6. apply
7. verify
8. assert before/after result

Also test a non-WebMCP browser to ensure progressive enhancement does not break normal human use.

---

# 17. Security / safety rules

This is important because the product can modify source code.

- Never expose GitHub tokens in client JavaScript.
- Use least-privilege GitHub permissions.
- Never let an arbitrary URL cause server-side access to internal/private network addresses.
- Protect scanning endpoints against SSRF.
- Validate URLs and block:
  - localhost
  - loopback
  - link-local
  - private IP ranges
  - metadata service addresses
- Add request timeouts.
- Put sane size limits on fetched pages/files.
- Sanitize untrusted page content before presenting it.
- Treat website content and repository text as **untrusted input**.
- Do not allow web page content to override system instructions.
- Never execute arbitrary code from the scanned website.
- Never automatically apply model-generated changes.
- Require explicit human approval.
- Create a branch instead of editing `main`.
- Log which issues led to which patch.
- Make all writes reversible.

---

# 18. UX principles

Mend should feel like a collaborative workspace, not a chatbot wrapper.

The human should always be able to see:

- what the agent is currently examining
- what issue it is acting on
- what source code it proposes to change
- whether an action is read-only or mutating
- what requires approval
- whether verification succeeded

Good:

> "2 fixes are ready for review."

Bad:

> "AI is working..."

Good:

> "This patch changes `Hero.tsx` and `ContactForm.tsx`. It does not change navigation."

Bad:

> "I fixed your website."

---

# 19. Suggested visual design

Aim for clean developer-tool aesthetics.

Layout idea:

```text
┌─────────────────────────────────────────────────────────────┐
│ Mend        example.com             GitHub: repo / branch   │
├─────────────────────────────────────────────────────────────┤
│ Performance 61   Accessibility 74   SEO 82   Broken Links 3 │
├───────────────────────┬─────────────────────────────────────┤
│ Issues                │ Selected issue                      │
│                       │                                     │
│ HIGH Oversized image  │ Evidence                            │
│ HIGH Missing labels   │ Source mapping                      │
│ MED  Missing meta     │ Proposed fix                        │
│                       │                                     │
│                       │ [Generate patch]                    │
├───────────────────────┴─────────────────────────────────────┤
│ Activity: scan → proposal → approval → patch → verification │
└─────────────────────────────────────────────────────────────┘
```

Keep animation restrained. Spend polish time on:

- information hierarchy
- useful loading states
- diff readability
- dramatic before/after score presentation
- visible WebMCP activity

---

# 20. Demo strategy

The submission video must be under 3 minutes.

Aim for **2:15–2:40**.

## Suggested demo script

### 0:00–0:15 — Problem

Show the intentionally flawed demo site.

Narration:

> "Website audits tell you what is wrong. Coding agents can edit source code. But turning an audit into a safe, verified fix still takes several disconnected steps."

### 0:15–0:30 — Mend

Open Mend.

> "Mend makes that workflow agent-native with WebMCP."

Show initial scores.

### 0:30–1:05 — Agent inspects

In ChatGPT's in-app browser, ask:

> "Find the biggest accessibility and performance issues on this site."

Agent calls WebMCP tools.

Show the Mend dashboard updating.

### 1:05–1:35 — Agent proposes repair

Ask:

> "Fix the safe issues without changing the visual design."

Agent calls:

- issue inspection
- `propose_fix`

Mend shows a source diff.

### 1:35–1:50 — Human approval

Explicitly click **Approve**.

Emphasize:

> "The agent cannot change source until I approve the patch."

### 1:50–2:10 — Apply

Agent calls `apply_approved_fix`.

Show branch/PR or successful patch state.

### 2:10–2:30 — Verify

Agent calls `verify_fix`.

Show dramatic result:

```text
Performance       61 → 91
Accessibility     74 → 98
Regressions        0
```

### 2:30–2:40 — Closing line

> "WebMCP lets Mend turn a website from something an agent merely looks at into a structured workspace where the developer and agent can inspect, repair, and verify together."

End.

---

# 21. Submission description draft outline

Do not finalize this until the product is working.

## Title

Mend — An agent-native website repair workspace

## Short pitch

Mend turns website maintenance into a collaborative human-agent workflow. It scans a site, exposes the audit and repair workflow through WebMCP, proposes source-level fixes, waits for explicit human approval, applies approved changes on a safe branch, and verifies whether they actually improved the site.

## Why WebMCP

Without WebMCP, an agent has to infer actions from visual UI elements or depend on a separate backend integration. Mend exposes high-level website-repair capabilities directly from the active web app: scanning, listing issues, inspecting evidence, proposing fixes, applying approved patches, and verifying results.

## Human + agent collaboration

The agent handles repetitive analysis and tool chaining. The human remains responsible for approving source changes. Both operate over the same visible state.

## Previously difficult workflow

Before:

audit → interpret → locate file → edit → deploy → rescan → compare

With Mend:

ask → inspect → review patch → approve → verify

## Technical implementation

Explain:

- WebMCP imperative tools registered through `document.modelContext`
- normalized audit data
- accessibility/performance analysis
- GitHub source integration
- approval gate
- verification pass
- real-time UI synchronization

---

# 22. README requirements

Before submission, README should contain:

- product screenshot/GIF
- one-line pitch
- live demo link
- demo video link
- WebMCP explanation
- exposed WebMCP tools
- architecture diagram
- local setup
- required environment variables
- how to enable WebMCP in Chrome
- how to test the agent flow
- safety/approval model
- license
- known limitations

Also include a section titled:

## How to test this submission

with exact reproducible steps for judges.

---

# 23. Environment variables

Keep `.env.example` current.

Likely variables:

```bash
# App
NEXT_PUBLIC_APP_URL=

# GitHub
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_APP_ID=
GITHUB_PRIVATE_KEY=

# Optional persistence
DATABASE_URL=

# Optional model/provider key if the product itself generates patches
OPENAI_API_KEY=
```

Do not commit real credentials.

Do not require an OpenAI API call simply for the sake of saying the app uses OpenAI. The hackathon requirement is WebMCP.

---

# 24. What the product itself should use AI for

If using an LLM inside Mend, use it where it adds real value:

- translate audit evidence into a concise explanation
- map an issue to likely source files
- generate candidate source patches
- explain tradeoffs
- group related issues

Do not use an LLM for things deterministic code does better:

- URL validation
- parsing HTML
- calculating score deltas
- diff generation
- approval checking
- basic link validation
- JSON schema validation

---

# 25. Source patch strategy

For the hackathon, reliability beats generality.

Recommended pipeline:

1. fetch only relevant authorized repo files
2. create a bounded context window
3. ask model for structured patch proposal
4. validate paths
5. reject files outside allowed repo
6. generate a standard diff
7. show human
8. record approval
9. create branch
10. apply patch
11. run tests/build if feasible
12. expose preview URL
13. re-audit
14. compare

Do not execute arbitrary shell commands originating from scanned website content.

---

# 26. Issue → source mapping strategy

This is a hard problem. Keep it pragmatic.

Use available evidence:

- element selector
- text content
- image `src`
- `id`
- class names
- route/path
- component strings found in repository
- asset filenames

Return confidence.

Example:

```json
{
  "path": "components/Hero.tsx",
  "confidence": 0.91,
  "reason": "Contains hero image src and matching heading text"
}
```

If confidence is low, say so rather than hallucinating a file.

---

# 27. Progressive enhancement

Mend must work as a normal website even without WebMCP.

Without WebMCP:

- user can scan manually
- user can inspect issues
- user can generate patches
- user can approve/reject
- user can verify

With WebMCP:

- the agent can orchestrate the same application capabilities reliably

This makes the value proposition easy to explain:

**WebMCP adds a structured agent control plane to an already-useful human UI.**

---

# 28. Definition of "hackathon ready"

Do not call the project submission-ready until all are true:

- [ ] deployed live URL works
- [ ] HTTPS works
- [ ] WebMCP tools register on deployed app
- [ ] agent successfully calls them
- [ ] scan returns real results
- [ ] issue list works
- [ ] source patch can be proposed
- [ ] human approval is required
- [ ] approved patch can be applied
- [ ] verification runs
- [ ] at least one before/after improvement is demonstrated
- [ ] no critical console errors
- [ ] mobile/desktop layouts are usable
- [ ] public repo exists
- [ ] open-source LICENSE exists
- [ ] README has setup/testing instructions
- [ ] secrets removed
- [ ] demo script rehearsed
- [ ] public YouTube video <3 minutes
- [ ] Devpost description completed
- [ ] live URL and repo accessible while logged out
- [ ] judge credentials provided if auth is required

---

# 29. Final pre-submission checklist

## Code

- [ ] clean production build
- [ ] typecheck passes
- [ ] lint passes
- [ ] tests pass
- [ ] dead code removed
- [ ] `.env` ignored
- [ ] no tokens in git history
- [ ] license visible on repo
- [ ] dated commit history clearly shows hackathon work

## Live app

- [ ] correct production URL
- [ ] HTTPS
- [ ] WebMCP works
- [ ] demo account/repo is stable
- [ ] judge can access app
- [ ] no local-only URLs
- [ ] no rate limits likely to break judging

## Demo video

- [ ] under 3:00
- [ ] public YouTube URL
- [ ] audio included
- [ ] clearly shows working app
- [ ] clearly shows WebMCP agent interaction
- [ ] human approval moment is visible
- [ ] before/after verification is visible
- [ ] no copyrighted background music

## Devpost

- [ ] project title
- [ ] short description
- [ ] WebMCP fit
- [ ] human-agent UX explanation
- [ ] implementation explanation
- [ ] live URL
- [ ] public repo URL
- [ ] video URL
- [ ] testing instructions
- [ ] credentials if required
- [ ] all content in English
- [ ] submit before the official-rule deadline

---

# 30. Post-deadline rule

Once the submission period closes, leave the submitted version alone during judging.

Do not modify:

- submitted Devpost entry
- submitted live deployment
- submitted repository/branch

If continued development is desired, fork/copy the project and work separately.

---

# 31. Suggested first Codex prompt

After putting this file in the repository root, give Codex:

> Read AGENTS.md completely. We are building the Mend WebMCP Challenge entry. Start with Phase 1 only. Scaffold a polished Next.js + TypeScript app, implement the landing page and audit dashboard using mock data, add the project structure described in AGENTS.md, add README.md, .env.example, and an open-source license. Do not begin GitHub integration or AI patch generation yet. Run the app, typecheck/lint it, and fix any errors before stopping.

Then proceed phase-by-phase rather than asking Codex to build the entire hackathon project in one giant prompt.

---

# 32. Suggested follow-up Codex prompts

## Phase 2

> Read AGENTS.md. Implement Phase 2 only. Replace mock audit results with a normalized real audit pipeline for accessibility, basic performance, SEO metadata, and broken links. Keep the `Audit` and `Issue` domain models stable. Add tests and make the UI display real results.

## Phase 3

> Read AGENTS.md. Implement Phase 3 only. Add the WebMCP read-only tool layer using `document.modelContext`. Register scan_site, get_audit_summary, list_issues, inspect_issue, and compare_audits. Feature-detect WebMCP and manage registration lifecycle correctly. Add a visible developer status panel showing which tools are registered. Do not add source mutation yet.

## Phase 4–5

> Read AGENTS.md. Implement the GitHub connection and proposed-fix workflow. The agent may inspect authorized source and generate candidate patches, but no patch may be applied until explicit human approval is recorded in the Mend UI. Add propose_fix, get_fix_diff, and request_fix_approval WebMCP tools.

## Phase 6–7

> Read AGENTS.md. Implement safe application and verification. apply_approved_fix must refuse unapproved fixes, create a branch instead of modifying main, and record what changed. verify_fix must re-run relevant checks and produce a before/after comparison including regressions.

## Final QA

> Read AGENTS.md and audit this repository as a hackathon judge would. Verify the primary Scan → Understand → Propose → Approve → Fix → Verify flow end-to-end, check WebMCP tool schemas and lifecycle, security boundaries, README setup instructions, public-demo readiness, and submission checklist. Fix any issues that can be fixed safely, and produce a remaining-blockers list.

---

# 33. Official references

Keep these links in the README/submission notes:

- OpenAI WebMCP Challenge:
  https://openai.com/webmcp-challenge/
- Devpost challenge:
  https://webmcp.devpost.com/
- Devpost official rules:
  https://webmcp.devpost.com/rules
- Devpost resources:
  https://webmcp.devpost.com/resources
- Chrome WebMCP documentation:
  https://developer.chrome.com/docs/ai/webmcp
- Chrome WebMCP imperative API:
  https://developer.chrome.com/docs/ai/webmcp/imperative-api

Important API note:

- Use `document.modelContext`.
- `navigator.modelContext` is deprecated in newer Chrome builds.
- For Chrome local testing, enable:
  `chrome://flags/#enable-webmcp-testing`

---

# 34. North-star rule

Whenever there is a tradeoff, optimize for the 3-minute judging experience:

**Can a judge immediately understand that a human and an agent are jointly repairing a real website, with WebMCP making the interaction structured, safe, and verifiable?**

If the answer is no, simplify the feature until the answer becomes yes.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
