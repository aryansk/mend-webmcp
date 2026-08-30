# Mend submitted project copy

This document is the prepared copy for the OpenAI WebMCP Challenge submission.
It is kept in the repository so the final form can be completed from one
source of truth.

## Project title

Mend: Safe, verified website repairs with WebMCP

## Links

- Live demo: https://mend-webmcp.vercel.app/
- Public source: https://github.com/aryansk/mend-webmcp
- Devpost: https://devpost.com/software/mend-safe-verified-website-repairs-with-webmcp
- Demo video: https://www.youtube.com/watch?v=yrF_mGdoVAY

## Description

Mend turns website maintenance into a collaborative human and agent workflow.
It scans a website, explains the highest-impact accessibility and performance
issues, maps findings to authorized source files, proposes a bounded patch, waits
for an explicit human approval, applies the approved change to an isolated branch
snapshot, and verifies the result with a before-and-after comparison.

Website audits and coding agents are usually disconnected. A developer has to
run a scan, interpret the findings, locate the source, decide whether a fix is
safe, edit the code, deploy it, run the checks again, and compare the result.
Mend keeps those steps in one workspace and makes the state legible to both the
human and the agent.

WebMCP is a strong fit because the workflow is a sequence of structured actions,
not a request for an agent to guess which pixels to click. Mend registers
high-level tools through `document.modelContext`: `scan_site`,
`get_audit_summary`, `list_issues`, `inspect_issue`, source inspection,
`propose_fix`, `get_fix_diff`, `request_fix_approval`,
`apply_approved_fix`, `verify_fix`, and `compare_audits`. The agent can use the
same compact audit and source state that the human sees in the dashboard.

The human remains responsible for source-changing decisions. A proposed patch
is shown as an exact diff, and the apply tool rejects unapproved fixes. The demo
creates a branch-first controlled snapshot and leaves the checked-in `main`
fixture unchanged. Verification replays the normalized checks and surfaces
resolved issues, remaining findings, score deltas, and regressions.

In the deterministic demo, Mend repairs missing hero-image alternative text.
The accessibility score moves from 74 to 89, one targeted issue is resolved, and
zero regressions are reported.

## How to test this submission

1. Open the live demo and choose **Try the deterministic demo workspace**.
2. Choose **Scan site**, then **Connect demo repo**.
3. Select **Hero image is missing alternative text**.
4. Choose **Propose safe fix** and review the exact `Hero.tsx` diff.
5. Choose **Approve patch**, then **Apply approved patch**.
6. Choose **Verify branch snapshot** and confirm **Fix verified**, one resolved
   issue, and zero regressions.
7. In a WebMCP-capable browser, ask the agent to scan the demo site, list the
   high-impact issues, inspect the mapped source, propose the safe fix, and
   compare the saved before and after audits. Approve the patch in the Mend UI
   before asking the agent to apply it.

## Limitations

- The source repair flow is intentionally bounded to the checked-in demo
  repository for reliability.
- Audit, fix, branch, and verification records are in-memory demo stores.
- Verification replays a controlled branch snapshot and does not deploy a real
  preview environment.
- GitHub OAuth, remote commits, pull requests, and durable persistence are not
  enabled in this challenge build.
