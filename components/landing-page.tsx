"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Gauge,
  GitBranch,
  LogoMark,
  ShieldCheck,
  Sparkle,
} from "./icons";

const workflow = [
  {
    number: "01",
    title: "Scan",
    detail: "Surface the issues that matter most.",
    state: "complete",
  },
  {
    number: "02",
    title: "Understand",
    detail: "Trace evidence back to the source.",
    state: "complete",
  },
  {
    number: "03",
    title: "Approve",
    detail: "Review every change before it lands.",
    state: "active",
  },
  {
    number: "04",
    title: "Verify",
    detail: "Prove the fix improved the site.",
    state: "pending",
  },
];

export function LandingPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function handleScan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = url.trim();
    const candidate = value.startsWith("http") ? value : "https://" + value;

    try {
      const parsed = new URL(candidate);
      if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname) {
        throw new Error("invalid");
      }

      setError("");
      router.push("/dashboard?site=" + encodeURIComponent(parsed.toString()));
    } catch {
      setError("Enter a valid website URL, such as https://example.com.");
    }
  }

  function loadDemo() {
    setUrl("https://demo.mend.local");
    setError("");
    setNotice("Demo workspace loaded. Scan to open the mock audit.");
  }

  return (
    <main className="landing-page">
      <div className="ambient-orb ambient-orb-one" />
      <div className="ambient-orb ambient-orb-two" />

      <header className="site-header page-width">
        <Link className="brand" href="/" aria-label="Mend home">
          <span className="brand-mark">
            <LogoMark width={21} height={21} />
          </span>
          <span>
            <span className="brand-name">Mend</span>
            <span className="brand-kicker">WebMCP repair workspace</span>
          </span>
        </Link>

        <nav className="header-nav" aria-label="Primary navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#agent-layer">Agent layer</a>
          <button
            className="header-link-button"
            type="button"
            onClick={() =>
              setNotice("Open the dashboard to connect the controlled demo repository.")
            }
          >
            Connect GitHub
            <ArrowUpRight width={14} height={14} />
          </button>
        </nav>
      </header>

      <section className="hero page-width">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-pulse" />
            Human-approved website repair
          </div>
          <h1>
            Turn website audits into
            <span className="accent-line"> safe, verified repairs.</span>
          </h1>
          <p className="hero-description">
            Mend gives your agent a structured control plane for finding,
            explaining, and proposing fixes, while you stay in charge of every
            source change.
          </p>

          <form className="scan-form" onSubmit={handleScan}>
            <label className="sr-only" htmlFor="site-url">
              Website URL
            </label>
            <div className="url-input-wrap">
              <span className="input-prefix">https://</span>
              <input
                id="site-url"
                name="site-url"
                placeholder="your-site.com"
                type="text"
                value={url.replace(/^https?:\/\//, "")}
                onChange={(event) => {
                  setUrl(event.target.value);
                  setError("");
                  setNotice("");
                }}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "url-error" : undefined}
              />
            </div>
            <button className="primary-button" type="submit">
              Scan site
              <ArrowRight width={17} height={17} />
            </button>
          </form>
          {error ? (
            <p className="form-message form-message-error" id="url-error">
              {error}
            </p>
          ) : null}
          {notice ? <p className="form-message">{notice}</p> : null}
          <button className="demo-link" type="button" onClick={loadDemo}>
            <Sparkle width={14} height={14} />
            Try the deterministic demo workspace
          </button>

          <div className="hero-proof-row">
            <div className="proof-item">
              <span className="proof-icon proof-icon-green">
                <ShieldCheck width={16} height={16} />
              </span>
              <span>
                <strong>Human in control</strong>
                <small>Approval before source changes</small>
              </span>
            </div>
            <div className="proof-item">
              <span className="proof-icon proof-icon-purple">
                <GitBranch width={16} height={16} />
              </span>
              <span>
                <strong>Safe by default</strong>
                <small>Branch-first change flow</small>
              </span>
            </div>
          </div>
        </div>

        <div className="hero-visual" aria-label="Mend workflow preview">
          <div className="visual-window">
            <div className="window-topbar">
              <div className="window-dots">
                <span />
                <span />
                <span />
              </div>
              <span className="window-label">mend / audit_001</span>
              <span className="window-state">
                <span className="state-dot" />
                live preview
              </span>
            </div>
            <div className="workflow-header">
              <div>
                <span className="micro-label">REPAIR WORKFLOW</span>
                <h2>example.com</h2>
              </div>
              <span className="mock-badge">MOCK DATA</span>
            </div>
            <div className="workflow-list">
              {workflow.map((step) => (
                <div className={"workflow-step " + step.state} key={step.number}>
                  <span className="workflow-number">{step.number}</span>
                  <span className="workflow-step-copy">
                    <strong>{step.title}</strong>
                    <small>{step.detail}</small>
                  </span>
                  <span className="workflow-status">
                    {step.state === "complete" ? (
                      <Check width={13} height={13} />
                    ) : step.state === "active" ? (
                      <span className="active-status">Review</span>
                    ) : (
                      <span className="pending-status">Queued</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
            <div className="preview-diff">
              <div className="preview-diff-head">
                <span>
                  <CodeGlyph />
                  proposed patch
                </span>
                <span className="safe-badge">SAFE CHANGE</span>
              </div>
              <div className="code-line code-line-muted">
                <span>−</span>
                <code>&lt;img src=&quot;/hero.webp&quot; alt=&quot;&quot; /&gt;</code>
              </div>
              <div className="code-line code-line-added">
                <span>+</span>
                <code>
                  &lt;img src=&quot;/hero.webp&quot; alt=&quot;Team reviewing a
                  site&quot; /&gt;
                </code>
              </div>
              <div className="diff-footer">
                <span>1 file · navigation unchanged</span>
                <span className="approval-pill">awaiting approval</span>
              </div>
            </div>
          </div>
          <div className="visual-caption">
            <Gauge width={15} height={15} />
            <span>Agent-ready tools. Developer-readable state.</span>
          </div>
        </div>
      </section>

      <section className="principles page-width" id="how-it-works">
        <div className="section-intro">
          <span className="micro-label">THE MEND LOOP</span>
          <h2>From “something is wrong” to “we proved it’s fixed.”</h2>
        </div>
        <div className="principle-grid">
          <div className="principle-card">
            <span className="principle-number">01</span>
            <h3>Evidence, not guesswork</h3>
            <p>
              Audit findings stay tied to a page, selector, and source hint so
              the agent can reason over the same facts you can see.
            </p>
          </div>
          <div className="principle-card">
            <span className="principle-number">02</span>
            <h3>Approval is a product feature</h3>
            <p>
              Proposed patches are visible and reversible. Nothing mutates
              before a human explicitly approves it in Mend.
            </p>
          </div>
          <div className="principle-card" id="agent-layer">
            <span className="principle-number">03</span>
            <h3>WebMCP as the control plane</h3>
            <p>
              The same workspace exposes compact tools for scanning, inspecting,
              and comparing audits, without turning Mend into a generic chat
              window.
            </p>
          </div>
        </div>
      </section>

      <footer className="site-footer page-width">
        <span>© 2026 Mend. Built for the WebMCP Challenge.</span>
        <span className="footer-status">
          <span className="state-dot" />
          Phase 4 · Source integration
        </span>
      </footer>
    </main>
  );
}

function CodeGlyph() {
  return (
    <span className="code-glyph" aria-hidden="true">
      {"</>"}
    </span>
  );
}
