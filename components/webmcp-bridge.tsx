"use client";

import { useEffect } from "react";
import {
  registerMendTools,
  type WebMcpStatus,
} from "../lib/webmcp/register-tools";
import type { AppliedFix, Audit, ProposedFix } from "../lib/types";

export function WebMcpBridge({
  onAudit,
  onApply,
  onFix,
  onStatus,
}: {
  onAudit: (audit: Audit) => void;
  onApply: (fix: ProposedFix, branch: AppliedFix) => void;
  onFix: (fix: ProposedFix) => void;
  onStatus: (status: WebMcpStatus) => void;
}) {
  useEffect(
    () => registerMendTools({ onAudit, onApply, onFix, onStatus }),
    [onAudit, onApply, onFix, onStatus],
  );

  return null;
}
