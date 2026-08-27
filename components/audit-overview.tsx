import type { CSSProperties } from "react";
import {
  AlertTriangle,
  Check,
  Gauge,
  Link2,
  Search,
  ShieldCheck,
} from "./icons";
import type { Audit, ScoreKey, VerificationResult } from "../lib/types";

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
    color: "#75D6A2",
    icon: Gauge,
  },
  {
    key: "accessibility",
    label: "Accessibility",
    detail: "Inclusive UX",
    color: "#B79BEF",
    icon: ShieldCheck,
  },
  {
    key: "seo",
    label: "SEO",
    detail: "Search readiness",
    color: "#6CB9E8",
    icon: Search,
  },
];

export function AuditOverview({
  audit,
  verification,
  onNotice,
}: {
  audit: Audit | null;
  verification: VerificationResult | null;
  onNotice: (message: string) => void;
}) {
  return (
    <>
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
                    onNotice(
                      "Verified score history appears after an approved fix is applied and checked.",
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
              onClick={() =>
                onNotice("Broken links are checked within each live audit.")
              }
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

      {verification ? (
        <VerificationPanel verification={verification} />
      ) : null}
    </>
  );
}

function VerificationPanel({
  verification,
}: {
  verification: VerificationResult;
}) {
  return (
    <section className="verification-panel panel" id="verification">
      <div className="panel-header verification-header">
        <div>
          <span className="micro-label">BEFORE / AFTER VERIFICATION</span>
          <h2>
            {verification.verified ? "Fix verified" : "Verification needs review"}
          </h2>
          <p>
            Patched source snapshot verification
            {verification.previewUrl ? " · " + verification.previewUrl : ""}
          </p>
        </div>
        <span
          className={
            "verification-badge " +
            (verification.verified
              ? "verification-badge-passed"
              : "verification-badge-warning")
          }
        >
          {verification.verified ? "PASSED" : "REVIEW"}
        </span>
      </div>
      <div className="verification-metrics">
        {scoreCards.map((card) => {
          const beforeScore = verification.before.scores[card.key];
          const afterScore = verification.after.scores[card.key];
          const delta = verification.scoreDelta[card.key];

          return (
            <div className="verification-metric" key={card.key}>
              <span>{card.label}</span>
              <strong>
                {beforeScore ?? "—"} <small>→</small> {afterScore ?? "—"}
              </strong>
              <em
                className={
                  delta !== undefined && delta >= 0
                    ? "delta-positive"
                    : "delta-neutral"
                }
              >
                {formatDelta(delta)}
              </em>
            </div>
          );
        })}
        <div className="verification-metric">
          <span>Broken links</span>
          <strong>
            {verification.before.brokenLinks} <small>→</small>{" "}
            {verification.after.brokenLinks}
          </strong>
          <em
            className={
              verification.brokenLinksDelta <= 0
                ? "delta-positive"
                : "delta-neutral"
            }
          >
            {formatDelta(verification.brokenLinksDelta)}
          </em>
        </div>
      </div>
      <div className="verification-details">
        <div className="verification-check-list">
          {verification.checks.map((check) => (
            <div className="verification-check" key={check.label}>
              <span
                className={
                  "verification-check-icon " +
                  (check.status === "passed" ? "check-passed" : "check-warning")
                }
              >
                {check.status === "passed" ? (
                  <Check width={13} height={13} />
                ) : (
                  <AlertTriangle width={13} height={13} />
                )}
              </span>
              <span>
                <strong>{check.label}</strong>
                <small>{check.detail}</small>
              </span>
            </div>
          ))}
        </div>
        <div className="verification-summary-copy">
          <span className="detail-label">Saved audit chain</span>
          <code>{verification.beforeAuditId}</code>
          <span>to</span>
          <code>{verification.afterAuditId}</code>
          <small>
            {verification.resolvedIssueIds.length} resolved ·{" "}
            {verification.remainingIssueIds.length} remaining ·{" "}
            {verification.regressions.length} regressions
          </small>
        </div>
      </div>
    </section>
  );
}

function formatDelta(value: number | undefined) {
  if (value === undefined) {
    return "—";
  }

  return value > 0 ? "+" + value : String(value);
}
