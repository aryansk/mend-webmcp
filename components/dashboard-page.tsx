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
import { cacheRepositorySnapshot } from "../lib/webmcp/tools";
import type {
  RepositoryConnection,
  RepositoryFile,
  RepositorySourceView,
} from "../lib/repository/types";
import { WebMcpBridge } from "./webmcp-bridge";
import { SourceViewer } from "./source-viewer";
import type {
  ActivityEvent,
  AppliedFix,
  Audit,
  AuditCategory,
  Issue,
  ProposedFix,
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
  const [activeFix, setActiveFix] = useState<ProposedFix | null>(null);
  const [appliedBranch, setAppliedBranch] = useState<AppliedFix | null>(null);
  const [isProposing, setIsProposing] = useState(false);
  const [isFixDecisionPending, setIsFixDecisionPending] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [notice, setNotice] = useState("");
  const [scanError, setScanError] = useState(initialError ?? "");
  const [fixError, setFixError] = useState("");
  const [activity, setActivity] = useState(initialActivity);
  const [repository, setRepository] = useState<RepositoryConnection | null>(null);
  const [sourceView, setSourceView] = useState<{
    repository: RepositoryConnection;
    source: RepositorySourceView;
  } | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [sourceError, setSourceError] = useState("");
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
      setSourceView(null);
      setActiveFix(null);
      setAppliedBranch(null);
      setPatchVisible(false);
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

  const handleToolFix = useCallback((fix: ProposedFix) => {
    setActiveFix(fix);
    setAppliedBranch(fix.applied ?? null);
    setPatchVisible(true);
    setFixError("");
    setNotice(
      fix.approvalStatus === "waiting_for_human"
        ? "The agent is waiting for your decision on the proposed patch."
        : "The agent prepared a patch for human review. No source was changed.",
    );
    setActivity((current) => [
      {
        id: "activity-" + Date.now(),
        label:
          fix.approvalStatus === "waiting_for_human"
            ? "Approval requested"
            : "Fix proposal received",
        detail:
          fix.files.length +
          " file" +
          (fix.files.length === 1 ? "" : "s") +
          " ready for review.",
        tone: "neutral",
        time: "just now",
      },
      ...current,
    ]);
  }, []);

  const handleToolApply = useCallback((fix: ProposedFix, branch: AppliedFix) => {
    setActiveFix(fix);
    setAppliedBranch(branch);
    setPatchVisible(true);
    setFixError("");
    setNotice(
      "Created " + branch.branchName + " from the approved patch. Main remains unchanged.",
    );
    setActivity((current) => [
      {
        id: "activity-" + Date.now(),
        label: "Demo branch created",
        detail: branch.branchName + " · commit " + branch.commitSha.slice(0, 8),
        tone: "success",
        time: "just now",
      },
      ...current,
    ]);
  }, []);

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

  async function handleConnectRepository() {
    if (repository) {
      setNotice(
        repository.fullName + " is already connected on " + repository.branch + ".",
      );
      return;
    }

    setIsConnecting(true);
    setSourceError("");

    try {
      const response = await fetch("/api/repositories", {
        body: JSON.stringify({ provider: "demo" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as {
        repository?: RepositoryConnection;
        files?: RepositoryFile[];
        error?: string;
      };

      if (!response.ok || !payload.repository || !payload.files) {
        throw new Error(payload.error ?? "The repository could not be connected.");
      }

      const connectedRepository = payload.repository;
      const connectedFiles = payload.files;

      setRepository(connectedRepository);
      cacheRepositorySnapshot({
        repository: connectedRepository,
        files: connectedFiles,
      });
      setActivity((current) => [
        {
          id: "activity-" + Date.now(),
          label: "Demo repository connected",
          detail:
            connectedRepository.fullName +
            " · " +
            connectedRepository.fileCount +
            " source files available.",
          tone: "success",
          time: "just now",
        },
        ...current,
      ]);
      setNotice(
        "Connected " +
          connectedRepository.fullName +
          " on " +
          connectedRepository.branch +
          ".",
      );
    } catch (error) {
      setSourceError(
        error instanceof Error
          ? error.message
          : "The repository could not be connected.",
      );
    } finally {
      setIsConnecting(false);
    }
  }

  async function handleInspectSource() {
    if (!selectedIssue) {
      return;
    }

    if (!repository) {
      setNotice("Connect the controlled demo repository before inspecting source.");
      return;
    }

    setSourceError("");

    try {
      const query =
        "/api/repositories/source?repositoryId=" +
        encodeURIComponent(repository.id) +
        "&issueId=" +
        encodeURIComponent(selectedIssue.id);
      const response = await fetch(query);
      const payload = (await response.json()) as {
        repository?: RepositoryConnection;
        source?: RepositorySourceView;
        error?: string;
      };

      if (!response.ok || !payload.repository || !payload.source) {
        throw new Error(payload.error ?? "The source mapping could not be read.");
      }

      setSourceView({
        repository: payload.repository,
        source: payload.source,
      });
      setNotice(
        "Verified " + payload.source.filePath + " against the connected repository.",
      );
    } catch (error) {
      setSourceError(
        error instanceof Error
          ? error.message
          : "The source mapping could not be read.",
      );
    }
  }

  const webmcpStatusLabel = getWebMcpStatusLabel(webmcpStatus.state);
  const webmcpStatusClass = getWebMcpStatusClass(webmcpStatus.state);

  async function handleProposeFix() {
    if (!selectedIssue || !repository) {
      if (!repository) {
        setNotice("Connect the controlled demo repository before proposing a fix.");
      }
      return;
    }

    setIsProposing(true);
    setFixError("");
    setNotice("");

    try {
      const response = await fetch("/api/fixes", {
        body: JSON.stringify({
          repositoryId: repository.id,
          issueIds: [selectedIssue.id],
          constraints: ["do not change visual design", "do not change navigation"],
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as {
        fix?: ProposedFix;
        error?: string;
      };

      if (!response.ok || !payload.fix) {
        throw new Error(payload.error ?? "The proposed fix could not be generated.");
      }

      const approvalResponse = await fetch("/api/fixes/approval", {
        body: JSON.stringify({ fixId: payload.fix.id }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const approvalPayload = (await approvalResponse.json()) as {
        fix?: ProposedFix;
        error?: string;
      };

      if (!approvalResponse.ok || !approvalPayload.fix) {
        throw new Error(
          approvalPayload.error ?? "The proposed fix could not be sent for approval.",
        );
      }

      setActiveFix(approvalPayload.fix);
      setAppliedBranch(null);
      setPatchVisible(true);
      setNotice("A patch is ready. Review it and make the approval decision.");
      setActivity((current) => [
        {
          id: "activity-" + Date.now(),
          label: "Approval requested",
          detail: selectedIssue.title,
          tone: "neutral",
          time: "just now",
        },
        ...current,
      ]);
    } catch (error) {
      setFixError(
        error instanceof Error
          ? error.message
          : "The proposed fix could not be generated.",
      );
    } finally {
      setIsProposing(false);
    }
  }

  async function handleDraftDecision(decision: "approved" | "rejected") {
    if (!activeFix || activeFix.approvalStatus !== "waiting_for_human") {
      return;
    }

    setIsFixDecisionPending(true);
    setFixError("");

    try {
      const response = await fetch("/api/fixes/decision", {
        body: JSON.stringify({ decision, fixId: activeFix.id }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as {
        fix?: ProposedFix;
        error?: string;
      };

      if (!response.ok || !payload.fix) {
        throw new Error(payload.error ?? "The approval decision could not be recorded.");
      }

      setActiveFix(payload.fix);
      setAppliedBranch(null);
      setNotice(
        decision === "approved"
          ? "Human approval recorded. Review once more, then apply to a safe branch."
          : "Patch rejected. No source changed.",
      );
      setActivity((current) => [
        {
          id: "activity-" + Date.now(),
          label: decision === "approved" ? "Human approval recorded" : "Patch rejected",
            detail:
            decision === "approved"
              ? "The patch is approved and ready for branch-first application."
              : "The proposed source change was discarded.",
          tone: decision === "approved" ? "success" : "warning",
          time: "just now",
        },
        ...current,
      ]);
    } catch (error) {
      setFixError(
        error instanceof Error
          ? error.message
          : "The approval decision could not be recorded.",
      );
    } finally {
      setIsFixDecisionPending(false);
    }
  }

  async function handleApplyFix() {
    if (!activeFix) {
      return;
    }

    if (activeFix.approvalStatus !== "approved" || activeFix.status !== "approved") {
      setNotice("A human must approve this patch before it can be applied.");
      return;
    }

    setIsApplying(true);
    setFixError("");

    try {
      const response = await fetch("/api/fixes/apply", {
        body: JSON.stringify({ fixId: activeFix.id }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as {
        fix?: ProposedFix;
        branch?: AppliedFix;
        error?: string;
      };

      if (!response.ok || !payload.fix || !payload.branch) {
        throw new Error(payload.error ?? "The approved fix could not be applied.");
      }

      setActiveFix(payload.fix);
      setAppliedBranch(payload.branch);
      setNotice(
        "Created " +
          payload.branch.branchName +
          " with commit " +
          payload.branch.commitSha.slice(0, 8) +
          ". Main remains unchanged.",
      );
      setActivity((current) => [
        {
          id: "activity-" + Date.now(),
          label: "Demo branch created",
          detail:
            payload.branch?.branchName +
            " · commit " +
            payload.branch?.commitSha.slice(0, 8),
          tone: "success",
          time: "just now",
        },
        ...current,
      ]);
    } catch (error) {
      setFixError(
        error instanceof Error
          ? error.message
          : "The approved fix could not be applied.",
      );
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <main className="dashboard-page">
      <WebMcpBridge
        onAudit={handleToolAudit}
        onApply={handleToolApply}
        onFix={handleToolFix}
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
            className={"repo-card " + (repository ? "repo-card-connected" : "")}
            type="button"
            onClick={handleConnectRepository}
            disabled={isConnecting}
          >
            <span className="repo-card-icon">
              <GitBranch width={16} height={16} />
            </span>
            <span>
              <strong>{repository?.fullName ?? "Repository"}</strong>
              <small>
                {isConnecting
                  ? "Connecting…"
                  : repository
                    ? repository.branch + " · " + repository.fileCount + " files"
                    : "Demo repository available"}
              </small>
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
                  ? "Audit, source, and human-review tools are available to the active agent."
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
                : "Phase 6 of 8"}
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
              onClick={handleConnectRepository}
              disabled={isConnecting}
            >
              <GitBranch width={15} height={15} />
              {repository
                ? "Source connected"
                : isConnecting
                  ? "Connecting…"
                  : "Connect demo repo"}
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

        {sourceError ? (
          <div className="dashboard-notice dashboard-notice-error" role="alert">
            <AlertTriangle width={16} height={16} />
            <span>{sourceError}</span>
            <button
              type="button"
              onClick={() => setSourceError("")}
              aria-label="Dismiss source error"
            >
              <X width={15} height={15} />
            </button>
          </div>
        ) : null}

        {fixError ? (
          <div className="dashboard-notice dashboard-notice-error" role="alert">
            <AlertTriangle width={16} height={16} />
            <span>{fixError}</span>
            <button
              type="button"
              onClick={() => setFixError("")}
              aria-label="Dismiss fix error"
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
                      setActiveFix(null);
                      setAppliedBranch(null);
                      setPatchVisible(false);
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
                  onClick={handleInspectSource}
                >
                  <ExternalLink width={15} height={15} />
                  {repository ? "Inspect source" : "Connect source first"}
                </button>
                <button
                  className="primary-button full-width"
                  type="button"
                  onClick={handleProposeFix}
                  disabled={!repository || isProposing}
                >
                  <Sparkle width={15} height={15} />
                  {isProposing
                    ? "Preparing fix…"
                    : repository
                      ? "Propose safe fix"
                      : "Connect source to propose"}
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
                <span className="micro-label">
                  {activeFix ? getApprovalLabel(activeFix.approvalStatus) : "DRAFT ONLY"}
                </span>
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
                <strong>
                  {activeFix
                    ? activeFix.files.map((file) => file.path).join(", ")
                    : "unmapped source"}
                </strong>
                <small>
                  {activeFix
                    ? activeFix.issueIds.length +
                      " mapped issue" +
                      (activeFix.issueIds.length === 1 ? "" : "s")
                    : displayIssue.title}
                </small>
              </span>
              <span className="safe-badge">
                {activeFix ? getFixApprovalShortLabel(activeFix.approvalStatus) : "DRAFT"}
              </span>
            </div>
            <div className="diff-view">
              <div className="diff-view-toolbar">
                <span>Exact proposed diff</span>
                <span>{activeFix ? formatFixStats(activeFix) : "Preparing…"}</span>
              </div>
              {activeFix?.files.map((file) => (
                <div className="diff-file-block" key={file.path}>
                  <div className="diff-file-toolbar">
                    <code>{file.path}</code>
                    <span>
                      {file.additions} insertion{file.additions === 1 ? "" : "s"} · {file.deletions} deletion
                      {file.deletions === 1 ? "" : "s"}
                    </span>
                  </div>
                  {file.diff.split("\n").map((line, index) => {
                    const isAddition = line.startsWith("+") && !line.startsWith("+++");
                    const isDeletion = line.startsWith("-") && !line.startsWith("---");
                    const isHeader = line.startsWith("@@") || line.startsWith("---") || line.startsWith("+++");
                    const rowClass = isAddition
                      ? "diff-row diff-row-add"
                      : isDeletion
                        ? "diff-row diff-row-delete"
                        : isHeader
                          ? "diff-row diff-row-header"
                          : "diff-row diff-row-context";
                    const marker = isAddition ? "+" : isDeletion ? "−" : " ";
                    const content = isAddition || isDeletion ? line.slice(1) : line;

                    return (
                      <div className={rowClass} key={file.path + "-" + index}>
                        <span>{marker}</span>
                        <code>{content}</code>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="patch-modal-explanation">
              <span className="impact-icon">
                <Sparkle width={15} height={15} />
              </span>
              <p>
                {activeFix?.explanation ??
                  "This patch will be shown here before any source-changing action."} {" "}
                {activeFix?.constraints.length
                  ? "Constraints: " + activeFix.constraints.join(" · ") + "."
                  : "Applying creates an isolated branch snapshot; main remains unchanged."}
              </p>
            </div>
            {appliedBranch ? (
              <div className="patch-branch-result">
                <span className="patch-branch-icon">
                  <GitBranch width={15} height={15} />
                </span>
                <span>
                  <strong>Branch snapshot created</strong>
                  <small>
                    {appliedBranch.branchName} · from {appliedBranch.baseBranch}
                  </small>
                </span>
                <code title={appliedBranch.commitSha}>
                  {appliedBranch.commitSha.slice(0, 8)}
                </code>
              </div>
            ) : null}
            <div className="patch-modal-footer">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setPatchVisible(false)}
              >
                Keep as draft
              </button>
              <button
                className="reject-button"
                type="button"
                onClick={() => handleDraftDecision("rejected")}
                disabled={
                  !activeFix ||
                  activeFix.approvalStatus !== "waiting_for_human" ||
                  isFixDecisionPending
                }
              >
                <X width={15} height={15} />
                {activeFix?.approvalStatus === "rejected" ? "Rejected" : "Reject patch"}
              </button>
              <button
                className={
                  "primary-button " +
                  (activeFix?.approvalStatus === "approved" ? "button-approved" : "")
                }
                type="button"
                onClick={() => handleDraftDecision("approved")}
                disabled={
                  !activeFix ||
                  activeFix.approvalStatus !== "waiting_for_human" ||
                  isFixDecisionPending
                }
              >
                {activeFix?.approvalStatus === "approved" ? (
                  <Check width={15} height={15} />
                ) : (
                  <ShieldCheck width={15} height={15} />
                )}
                {activeFix?.approvalStatus === "approved" ? "Approved" : "Approve patch"}
              </button>
              {activeFix?.approvalStatus === "approved" ? (
                <button
                  className={"primary-button apply-button " + (appliedBranch ? "button-approved" : "")}
                  type="button"
                  onClick={handleApplyFix}
                  disabled={isApplying || Boolean(appliedBranch)}
                >
                  {appliedBranch ? (
                    <Check width={15} height={15} />
                  ) : (
                    <GitBranch width={15} height={15} />
                  )}
                  {isApplying
                    ? "Creating branch…"
                    : appliedBranch
                      ? "Branch created"
                      : "Apply approved patch"}
                </button>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {sourceView ? (
        <SourceViewer
          repository={sourceView.repository}
          source={sourceView.source}
          onClose={() => setSourceView(null)}
        />
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

function getApprovalLabel(status: ProposedFix["approvalStatus"]) {
  if (status === "waiting_for_human") {
    return "AWAITING HUMAN APPROVAL · NO SOURCE MUTATION";
  }

  if (status === "approved") {
    return "APPROVED BY HUMAN · NO SOURCE MUTATION";
  }

  if (status === "rejected") {
    return "REJECTED BY HUMAN · NO SOURCE MUTATION";
  }

  return "DRAFT ONLY · NO SOURCE MUTATION";
}

function getFixApprovalShortLabel(status: ProposedFix["approvalStatus"]) {
  if (status === "waiting_for_human") {
    return "AWAITING APPROVAL";
  }

  return status.toUpperCase().replaceAll("_", " ");
}

function formatFixStats(fix: ProposedFix) {
  const additions = fix.files.reduce((total, file) => total + file.additions, 0);
  const deletions = fix.files.reduce((total, file) => total + file.deletions, 0);

  return (
    fix.files.length +
    " file" +
    (fix.files.length === 1 ? "" : "s") +
    " · " +
    additions +
    " insertion" +
    (additions === 1 ? "" : "s") +
    " · " +
    deletions +
    " deletion" +
    (deletions === 1 ? "" : "s")
  );
}
