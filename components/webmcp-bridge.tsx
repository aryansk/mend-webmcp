"use client";

import { useEffect } from "react";
import {
  registerMendTools,
  type WebMcpStatus,
} from "../lib/webmcp/register-tools";
import type { Audit } from "../lib/types";

export function WebMcpBridge({
  onAudit,
  onStatus,
}: {
  onAudit: (audit: Audit) => void;
  onStatus: (status: WebMcpStatus) => void;
}) {
  useEffect(
    () => registerMendTools({ onAudit, onStatus }),
    [onAudit, onStatus],
  );

  return null;
}
