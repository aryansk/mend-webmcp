"use client";

import { useEffect } from "react";
import {
  registerMendTools,
  type WebMcpStatus,
} from "../lib/webmcp/register-tools";
import type { Audit, ProposedFix } from "../lib/types";

export function WebMcpBridge({
  onAudit,
  onFix,
  onStatus,
}: {
  onAudit: (audit: Audit) => void;
  onFix: (fix: ProposedFix) => void;
  onStatus: (status: WebMcpStatus) => void;
}) {
  useEffect(
    () => registerMendTools({ onAudit, onFix, onStatus }),
    [onAudit, onFix, onStatus],
  );

  return null;
}
