"use client";

import { useEffect } from "react";
import {
  registerMendTools,
  type WebMcpStatus,
} from "../lib/webmcp/register-tools";
import type {
  AppliedFix,
  Audit,
  ProposedFix,
  VerificationResult,
} from "../lib/types";

export function WebMcpBridge({
  onAudit,
  onApply,
  onFix,
  onVerify,
  onStatus,
}: {
  onAudit: (audit: Audit) => void;
  onApply: (fix: ProposedFix, branch: AppliedFix) => void;
  onFix: (fix: ProposedFix) => void;
  onVerify: (verification: VerificationResult) => void;
  onStatus: (status: WebMcpStatus) => void;
}) {
  useEffect(
    () => registerMendTools({ onAudit, onApply, onFix, onVerify, onStatus }),
    [onAudit, onApply, onFix, onVerify, onStatus],
  );

  return null;
}
