"use client";

import type { CSSProperties } from "react";
import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle,
  Clock,
  Code2,
  ExternalLink,
  Gauge,
  GitBranch,
  Link2,
  LogoMark,
  Search,
  ShieldCheck,
  Sparkle,
  X,
} from "./icons";
import { getAuditSummary } from "../lib/audit/summary";
import type { WebMcpStatus } from "../lib/webmcp/register-tools";
import { WebMcpBridge } from "./webmcp-bridge";
import type {
  ActivityEvent,
  Audit,
  AuditCategory,
  Issue,
  ScoreKey,
} from "../lib/types";

const scoreCards: Array<{
  key: ScoreKey;
  label: string;
  detail: string;
  color: string;
  icon: typeof Gauge;
}> = [
  {
    key: "performance",
    label: "Performance",
    detail: "Page speed",
    color: "#b9f36b",
    icon: Gauge,
  },
  {
    key: "accessibility",
    label: "Accessibility",
    detail: "Inclusive UX",
    color: "#a78bfa",
    icon: ShieldCheck,
  },
  {
    key: "seo",
    label: "SEO",
    detail: "Search readiness",
    color: "#67e8f9",
    icon: Search,
  },
];

const initialActivity: ActivityEvent[] = [
  {
    id: "activity-1",
    label: "Audit loaded",
    detail: "Normalized findings are ready to inspect.",
    tone: "success",
    time: "just now",
  },
  {
    id: "activity-2",
    label: "WebMCP layer checking",
    detail: "The active browser is being checked for document.modelContext.",
    tone: "neutral",
    time: "now",
  },
  {
    id: "activity-3",
    label: "Repository disconnected",
    detail: "Connect a repo before source mapping is live.",
    tone: "warning",
    time: "waiting",
  },
];

const EMPTY_ISSUE: Issue = {
  id: "empty-issue",
  auditId: "",
  category: "accessibility",
  severity: "low",
  title: "No issue selected",
  description: "Run an audit to populate the prioritized findings.",
  pageUrl: "",
  evidence: "No audit issue is selected.",
  estimatedImpact: "A completed audit will show evidence and impact here.",
};

export function DashboardPage({
  initialSiteUrl,
  initialAudit,
  initialError,
}: {
  initialSiteUrl: string;
  initialAudit: Audit | null;
  initialError?: string;
}) {
  const [siteUrl, setSiteUrl] = useState(initialSiteUrl);
  const [audit, setAudit] = useState<Audit | null>(initialAudit);
  const [selectedIssueId, setSelectedIssueId] = useState(
    initialAudit?.issues[0]?.id ?? "",
  );
  const [isScanning, setIsScanning] = useState(false);
  const [patchVisible, setPatchVisible] = useState(false);
  const [draftApproved, setDraftApproved] = useState(false);
  const [notice, setNotice] = useState("");
  const [scanError, setScanError] = useState(initialError ?? "");
  const [activity, setActivity] = useState(initialActivity);
  const [webmcpStatus, setWebmcpStatus] = useState<WebMcpStatus>({
    state: "checking",
    registeredTools: [],
  });

  const applyAudit = useCallback(
    (nextAudit: Audit, activityLabel: string, activityDetail: string) => {
      setAudit(nextAudit);
      setSiteUrl(nextAudit.siteUrl);
      setSelectedIssueId(nextAudit.issues[0]?.id ?? "");
      setScanError("");
      setActivity((current) => [
        {
          id: "activity-" + Date.now(),
          label: activityLabel,
          detail: activityDetail,
          tone: "success",
          time: "just now",
        },
        ...current,
      ]);
    },
    [],
  );

  const handleToolAudit = useCallback(
    (nextAudit: Audit) => {
      applyAudit(
        nextAudit,
        "Agent scan completed",
        nextAudit.issues.length + " normalized findings are ready to inspect.",
      );
      setNotice("Agent scan loaded into the workspace.");
    },
    [applyAudit],
  );

  const handleWebMcpStatus = useCallback((status: WebMcpStatus) => {
    setWebmcpStatus(status);
  }, []);

  const selectedIssue = useMemo(
    () =>
      audit?.issues.find((issue) => issue.id === selectedIssueId) ??
      audit?.issues[0],
    [audit, selectedIssueId],
  );
  const displayIssue = selectedIssue ?? EMPTY_ISSUE;
  const issues = audit?.issues ?? [];
  const summary = audit
    ? getAuditSummary(audit)
    : { issueCount: 0, highImpactIssueCount: 0 };
  const isDemoAudit = audit?.id === "audit_demo_001";

  async function handleRescan() {
    setIsScanning(true);
    setNotice("");
    setScanError("");

    try {
      const response = await fetch("/api/audits", {
        body: JSON.stringify({
          url: siteUrl,
          categories: ["accessibility", "performance", "seo", "link"],
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as {
        audit?: Audit;
        error?: string;
      };

      if (!response.ok || !payload.audit) {
        throw new Error(payload.error ?? "The audit could not be completed.");
      }

      applyAudit(
        payload.audit,
        "Audit refreshed",
        payload.audit.issues.length +
          " normalized findings are ready to inspect.",
      );
      setNotice("Audit refreshed from the live target.");
    } catch (error) {
      setScanError(
        error instanceof Error
          ? error.message
          : "The audit could not be completed.",
      );
    } finally {
      setIsScanning(false);
    }
  }

  const webmcpStatusLabel = getWebMcpStatusLabel(webmcpStatus.state);
  const webmcpStatusClass = getWebMcpStatusClass(webmcpStatus.state);

  function handleProposeFix() {
    if (!selectedIssue) {
      return;
    }

    setPatchVisible(true);
    setDraftApproved(false);
    setNotice("A draft proposal is ready for human review. No source was changed.");
    setActivity((current) => [
      {
        id: "activity-" + Date.now(),
        label: "Draft fix proposed",
        detail: selectedIssue.title,
        tone: "neutral",
        time: "just now",
      },
      ...current,
    ]);
  }

  function handleDraftApproval() {
    setDraftApproved(true);
    setNotice(
      "Mock approval recorded. Applying source changes remains gated for the source integration phase.",
    );
    setActivity((current) => [
      {
        id: "activity-" + Date.now(),
        label: "Human approval recorded",
        detail: "The draft is approved in the demo state only.",
        tone: "success",
        time: "just now",
      },
      ...current,
    ]);
  }

  return (
    <main className="dashboard-page">
      <WebMcpBridge
        onAudit={handleToolAudit}
        onStatus={handleWebMcpStatus}
      />
      <aside className="dashboard-sidebar">
        <Link className="brand dashboard-brand" href="/" aria-label="Mend home">
          <span className="brand-mark">
            <LogoMark width={21} height={21} />
          </span>
          <span>
            <span className="brand-name">Mend</span>
            <span className="brand-kicker">repair workspace</span>
          </span>
        </Link>

        <div className="sidebar-section">
          <span className="sidebar-label">Workspace</span>
          <a className="sidebar-link active" href="#overview">
            <Activity width={16} height={16} />
            Overview
            <span className="sidebar-link-count">1</span>
          </a>
          <a className="sidebar-link" href="#issues">
            <AlertTriangle width={16} height={16} />
            Issues
            <span className="sidebar-link-count">{issues.length}</span>
          </a>
          <a className="sidebar-link" href="#activity">
            <Clock width={16} height={16} />
            Activity
          </a>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-label">Connected source</span>
          <button
            className="repo-card"
            type="button"
            onClick={() => setNotice("GitHub connection is scheduled for Phase 4.")}
          >
            <span className="repo-card-icon">
              <GitBranch width={16} height={16} />
            </span>
            <span>
              <strong>Repository</strong>
              <small>Not connected</small>
            </span>
            <ArrowRight width={14} height={14} />
          </button>
        </div>

        <div className="sidebar-bottom">
          <div className="webmcp-status-card">
            <div className="status-card-topline">
              <span className="status-card-icon">
                <Sparkle width={15} height={15} />
              </span>
              <span className={"status-pill " + webmcpStatusClass}>
                {webmcpStatusLabel}
              </span>
            </div>
            <strong>WebMCP control plane</strong>
            <p>
              {webmcpStatus.message ??
                (webmcpStatus.state === "ready"
                  ? "Read-only audit tools are available to the active agent."
                  : "Checking whether this browser can expose structured tools to an agent.")}
            </p>
            <div className="status-progress">
              <span
                style={{
                  width:
                    webmcpStatus.state === "ready"
                      ? "75%"
                      : webmcpStatus.state === "error"
                        ? "25%"
                        : "50%",
                }}
              />
            </div>
            <span className="status-progress-label">
              {webmcpStatus.state === "ready"
                ? webmcpStatus.registeredTools.length + " tools registered"
                : "Phase 3 of 4"}
            </span>
            {webmcpStatus.registeredTools.length > 0 ? (
              <div className="webmcp-tool-list" aria-label="Registered WebMCP tools">
                {webmcpStatus.registeredTools.map((toolName) => (
                  <span className="webmcp-tool-chip" key={toolName}>
                    {toolName}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <Link className="sidebar-footer-link" href="/">
            <span className="footer-logo-dot" />
            Back to Mend home
          </Link>
        </div>
      </aside>

      <section className="dashboard-content" id="overview">
        <header className="dashboard-header">
          <div>
            <div className="breadcrumb">
              <span>Workspace</span>
              <span>/</span>
              <strong>Overview</strong>
            </div>
            <div className="dashboard-title-row">
              <h1>{formatSiteName(siteUrl)}</h1>
              <span className="mock-badge">
                {isDemoAudit ? "DEMO DATA" : audit ? "LIVE AUDIT" : "NO AUDIT"}
              </span>
            </div>
            <p className="dashboard-subtitle">
              {audit
                ? "Last scanned just now · " +
                  summary.issueCount +
                  " issues found · " +
                  summary.highImpactIssueCount +
                  " high impact"
                : "No completed audit is available for this target."}
            </p>
          </div>
          <div className="dashboard-header-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() => setNotice("GitHub connection is scheduled for Phase 4.")}
            >
              <GitBranch width={15} height={15} />
              Connect repo
            </button>
            <button
              className="primary-button compact"
              type="button"
              onClick={handleRescan}
              disabled={isScanning}
            >
              <Activity width={15} height={15} />
              {isScanning ? "Scanning…" : "Rescan site"}
            </button>
          </div>
        </header>

        {notice ? (
          <div className="dashboard-notice" role="status">
            <CheckCircle width={16} height={16} />
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice("")} aria-label="Dismiss notice">
              <X width={15} height={15} />
            </button>
          </div>
        ) : null}

        {scanError ? (
          <div className="dashboard-notice dashboard-notice-error" role="alert">
            <AlertTriangle width={16} height={16} />
            <span>{scanError}</span>
            <button
              type="button"
              onClick={() => setScanError("")}
              aria-label="Dismiss audit error"
            >
              <X width={15} height={15} />
            </button>
          </div>
        ) : null}

        <div className="score-grid">
          {scoreCards.map((card) => {
            const Icon = card.icon;
            const score = audit?.scores[card.key];
            const ringStyle = {
              "--score": score ?? 0,
              "--ring-color": card.color,
            } as CSSProperties;

            return (
              <article className="score-card" key={card.key}>
                <div className="score-card-heading">
                  <span className="score-card-icon" style={{ color: card.color }}>
                    <Icon width={17} height={17} />
                  </span>
                  <span>
                    <strong>{card.label}</strong>
                    <small>{card.detail}</small>
                  </span>
                  <button
                    className="card-menu"
                    type="button"
                    aria-label={"More " + card.label + " options"}
                    onClick={() =>
                      setNotice(
                        card.label +
                          " history will be available once audit persistence is added.",
                      )
                    }
                  >
                    ···
                  </button>
                </div>
                <div className="score-card-value-row">
                  <div className="score-ring" style={ringStyle}>
                    <span>{score === undefined ? "—" : score}</span>
                  </div>
                  <div className="score-card-trend">
                    <span className="trend-neutral">
                      {audit ? "current" : "waiting"}
                    </span>
                    <small>{audit ? "Ready to improve" : "Run an audit"}</small>
                  </div>
                </div>
              </article>
            );
          })}
          <article className="score-card broken-links-card">
            <div className="score-card-heading">
              <span className="score-card-icon score-card-icon-red">
                <Link2 width={17} height={17} />
              </span>
              <span>
                <strong>Broken links</strong>
                <small>Reachability</small>
              </span>
              <button
                className="card-menu"
                type="button"
                aria-label="More broken links options"
                onClick={() => setNotice("Broken links are checked within each live audit.")}
              >
                ···
              </button>
            </div>
            <div className="broken-link-value">
              <strong>{audit ? audit.brokenLinks : "—"}</strong>
              <span>found</span>
            </div>
            <div className="broken-link-bar">
              <span
                style={{
                  width: audit
                    ? Math.min(100, audit.brokenLinks * 18) + "%"
                    : "0%",
                }}
              />
            </div>
            <small className="score-card-footnote">
              {audit
                ? (audit.checkedLinks ?? 0) + " same-site routes checked"
                : "Awaiting audit"}
            </small>
          </article>
        </div>

        <div className="dashboard-grid">
          <section className="issues-panel panel" id="issues">
            <div className="panel-header">
              <div>
                <span className="micro-label">PRIORITIZED FINDINGS</span>
                <h2>Issues to review</h2>
              </div>
              <button
                className="filter-button"
                type="button"
                onClick={() => setNotice("Issue filters will be added alongside audit history.")}
              >
                All issues
                <span>⌄</span>
              </button>
            </div>
            <div className="issue-list">
              {issues.length > 0 ? (
                issues.map((issue) => (
                  <button
                    className={
                      "issue-row " +
                      (selectedIssue?.id === issue.id ? "selected" : "")
                    }
                    key={issue.id}
                    type="button"
                    onClick={() => {
                      setSelectedIssueId(issue.id);
                      setNotice("");
                    }}
                  >
                    <span className={"severity-mark severity-" + issue.severity} />
                    <span className="issue-row-copy">
                      <span className="issue-row-title">{issue.title}</span>
                      <span className="issue-row-meta">
                        {formatCategory(issue.category)} · {formatPage(issue.pageUrl)}
                      </span>
                    </span>
                    <span className={"severity-badge severity-badge-" + issue.severity}>
                      {issue.severity}
                    </span>
                    <ArrowRight className="issue-row-arrow" width={15} height={15} />
                  </button>
                ))
              ) : (
                <div className="empty-state">
                  <span className="empty-state-icon">
                    {scanError ? (
                      <AlertTriangle width={17} height={17} />
                    ) : (
                      <CheckCircle width={17} height={17} />
                    )}
                  </span>
                  <strong>{scanError ? "Audit unavailable" : "No issues found"}</strong>
                  <span>
                    {scanError
                      ? "Fix the target or try the scan again."
                      : "The completed audit did not find any normalized findings."}
                  </span>
                </div>
              )}
            </div>
            <div className="panel-footer">
              <span>
                Showing {issues.length} of {issues.length} findings
              </span>
              <button
                className="text-button"
                type="button"
                onClick={() => setNotice("This audit is small enough to show in one view.")}
              >
                View all
                <ArrowRight width={14} height={14} />
              </button>
            </div>
          </section>

          <section className="issue-detail-panel panel">
            <div className="panel-header detail-header">
              <div>
                <span className="micro-label">SELECTED ISSUE</span>
                <h2>Why this matters</h2>
              </div>
              <span className={"severity-badge severity-badge-" + displayIssue.severity}>
                {displayIssue.severity}
              </span>
            </div>
            <div className="detail-content">
              <div className="detail-title-row">
                <span className={"detail-category-icon category-" + displayIssue.category}>
                  {displayIssue.category === "accessibility" ? (
                    <ShieldCheck width={18} height={18} />
                  ) : displayIssue.category === "performance" ? (
                    <Gauge width={18} height={18} />
                  ) : (
                    <Search width={18} height={18} />
                  )}
                </span>
                <h3>{displayIssue.title}</h3>
              </div>
              <p className="detail-description">{displayIssue.description}</p>

              <div className="detail-block">
                <span className="detail-label">
                  <Code2 width={14} height={14} />
                  Evidence
                </span>
                <code className="evidence-block">{displayIssue.evidence}</code>
              </div>

              <div className="detail-block source-block">
                <span className="detail-label">
                  <GitBranch width={14} height={14} />
                  Source mapping
                </span>
                <div className="source-hint">
                  <div>
                    <strong>{displayIssue.sourceHint?.filePath ?? "Source unavailable"}</strong>
                    <span>
                      {displayIssue.sourceHint
                        ? "Lines " +
                          displayIssue.sourceHint.lineStart +
                          "–" +
                          displayIssue.sourceHint.lineEnd
                        : "Connect a repository to inspect source"}
                    </span>
                  </div>
                  {displayIssue.sourceHint ? (
                    <span className="confidence-badge">
                      {Math.round(displayIssue.sourceHint.confidence * 100)}% match
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="impact-callout">
                <span className="impact-icon">
                  <Sparkle width={15} height={15} />
                </span>
                <span>
                  <strong>Expected impact</strong>
                  <small>{displayIssue.estimatedImpact}</small>
                </span>
              </div>

              <div className="detail-actions">
                <button
                  className="secondary-button full-width"
                  type="button"
                  onClick={() => setNotice("A connected repository is required to inspect source live.")}
                >
                  <ExternalLink width={15} height={15} />
                  Inspect source
                </button>
                <button className="primary-button full-width" type="button" onClick={handleProposeFix}>
                  <Sparkle width={15} height={15} />
                  Propose safe fix
                </button>
              </div>
              <p className="approval-note">
                <ShieldCheck width={14} height={14} />
                Nothing changes until a human approves a patch.
              </p>
            </div>
          </section>
        </div>

        <section className="activity-panel panel" id="activity">
          <div className="panel-header">
            <div>
              <span className="micro-label">WORKSPACE LOG</span>
              <h2>Activity</h2>
            </div>
            <span className="activity-live">
              <span className="state-dot" />
              live workspace
            </span>
          </div>
          <div className="activity-list">
            {activity.slice(0, 4).map((event) => (
              <div className="activity-row" key={event.id}>
                <span className={"activity-marker activity-marker-" + event.tone}>
                  {event.tone === "success" ? (
                    <Check width={13} height={13} />
                  ) : event.tone === "warning" ? (
                    <AlertTriangle width={13} height={13} />
                  ) : (
                    <Activity width={13} height={13} />
                  )}
                </span>
                <span className="activity-copy">
                  <strong>{event.label}</strong>
                  <small>{event.detail}</small>
                </span>
                <span className="activity-time">{event.time}</span>
              </div>
            ))}
          </div>
        </section>
      </section>

      {patchVisible ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPatchVisible(false);
            }
          }}
        >
          <section
            className="patch-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="patch-modal-title"
          >
            <div className="patch-modal-header">
              <div>
                <span className="micro-label">DRAFT ONLY · NO SOURCE MUTATION</span>
                <h2 id="patch-modal-title">Review proposed fix</h2>
              </div>
              <button
                className="modal-close"
                type="button"
                onClick={() => setPatchVisible(false)}
                aria-label="Close patch preview"
              >
                <X width={18} height={18} />
              </button>
            </div>
            <div className="patch-modal-summary">
              <span className="patch-file-icon">
                <Code2 width={16} height={16} />
              </span>
              <span>
                <strong>{displayIssue.sourceHint?.filePath ?? "unmapped source"}</strong>
                <small>{displayIssue.title}</small>
              </span>
              <span className="safe-badge">SAFE CHANGE</span>
            </div>
            <div className="diff-view">
              <div className="diff-view-toolbar">
                <span>Proposed diff</span>
                <span>1 file · 1 insertion · 1 deletion</span>
              </div>
              <div className="diff-row diff-row-context">
                <span> </span>
                <code>{"<section className=\"hero\">"}</code>
              </div>
              <div className="diff-row diff-row-delete">
                <span>−</span>
                <code>{displayIssue.evidence ?? "Existing implementation"}</code>
              </div>
              <div className="diff-row diff-row-add">
                <span>+</span>
                <code>{getProposedLine(displayIssue)}</code>
              </div>
              <div className="diff-row diff-row-context">
                <span> </span>
                <code>{"</section>"}</code>
              </div>
            </div>
            <div className="patch-modal-explanation">
              <span className="impact-icon">
                <Sparkle width={15} height={15} />
              </span>
              <p>
                This draft addresses the selected finding without changing
                navigation or visual layout. Phase 2 records the review state
                only; repository writes arrive after the source integration
                phase.
              </p>
            </div>
            <div className="patch-modal-footer">
              <button className="secondary-button" type="button" onClick={() => setPatchVisible(false)}>
                Keep as draft
              </button>
              <button
                className={"primary-button " + (draftApproved ? "button-approved" : "")}
                type="button"
                onClick={handleDraftApproval}
                disabled={draftApproved}
              >
                {draftApproved ? <Check width={15} height={15} /> : <ShieldCheck width={15} height={15} />}
                {draftApproved ? "Approved in demo" : "Approve draft preview"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function formatSiteName(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value.replace(/^https?:\/\//, "").replace(/\/$/, "") || "Demo site";
  }
}

function formatCategory(category: AuditCategory) {
  return category === "seo" ? "SEO" : category.charAt(0).toUpperCase() + category.slice(1);
}

function formatPage(value: string) {
  try {
    const url = new URL(value);
    return url.pathname === "/" ? "Homepage" : url.pathname;
  } catch {
    return value;
  }
}

function getWebMcpStatusLabel(state: WebMcpStatus["state"]) {
  if (state === "ready") {
    return "Ready";
  }

  if (state === "unsupported") {
    return "Unavailable";
  }

  if (state === "error") {
    return "Error";
  }

  return "Checking";
}

function getWebMcpStatusClass(state: WebMcpStatus["state"]) {
  if (state === "ready") {
    return "status-pill-ready";
  }

  if (state === "unsupported") {
    return "status-pill-unavailable";
  }

  if (state === "error") {
    return "status-pill-error";
  }

  return "status-pill-waiting";
}

function getProposedLine(issue: Issue) {
  const title = issue.title.toLowerCase();

  if (issue.id === "issue_img_alt" || title.includes("alternative text")) {
    return '<img src="/images/hero.webp" alt="Team reviewing a website audit" />';
  }

  if (issue.id === "issue_form_label" || title.includes("associated label")) {
    return '<label htmlFor="email">Email address</label>';
  }

  if (issue.id === "issue_hero_size" || title.includes("rendered need")) {
    return '<img src="/images/hero-640.webp" width="640" height="420" alt="Hero image" />';
  }

  if (issue.id === "issue_blocking_script" || title.includes("render-blocking")) {
    return '<Script src="/analytics.js" strategy="afterInteractive" />';
  }

  if (issue.id === "issue_meta_description" || title.includes("meta description")) {
    return 'description: "A concise summary of the site",';
  }

  return "<h2>Feature section</h2>";
}
