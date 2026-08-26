import dns from "node:dns/promises";
import net from "node:net";
import { AuditError } from "./errors";

const blockedHostnames = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata",
]);

export function normalizeTargetUrl(input: unknown): URL {
  if (typeof input !== "string" || input.trim().length === 0) {
    throw new AuditError(
      "Enter a website URL before starting an audit.",
      "invalid_url",
      400,
    );
  }

  let url: URL;

  try {
    url = new URL(input.trim());
  } catch {
    throw new AuditError(
      "Enter a valid absolute website URL, including https://.",
      "invalid_url",
      400,
    );
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new AuditError(
      "Only http:// and https:// websites can be audited.",
      "invalid_protocol",
      400,
    );
  }

  if (url.username || url.password) {
    throw new AuditError(
      "URLs with embedded credentials are not allowed.",
      "credentials_not_allowed",
      400,
    );
  }

  if (
    !url.hostname ||
    (isBlockedAddress(url.hostname) && !isDemoHostname(url.hostname))
  ) {
    throw new AuditError(
      "Private and local network targets cannot be audited.",
      "private_target",
      400,
    );
  }

  url.hash = "";
  return url;
}

export async function assertSafeTarget(url: URL) {
  if (isBlockedAddress(url.hostname)) {
    throw new AuditError(
      "Private and local network targets cannot be audited.",
      "private_target",
      400,
    );
  }

  if (net.isIP(url.hostname)) {
    return;
  }

  try {
    const addresses = await dns.lookup(url.hostname, {
      all: true,
      verbatim: true,
    });

    if (addresses.some((address) => isBlockedAddress(address.address))) {
      throw new AuditError(
        "The website resolves to a private or local network address.",
        "private_target",
        400,
      );
    }
  } catch (error) {
    if (error instanceof AuditError) {
      throw error;
    }

    throw new AuditError(
      "The website hostname could not be resolved.",
      "dns_error",
      422,
    );
  }
}

export function isDemoTarget(url: URL) {
  return isDemoHostname(url.hostname);
}

function isDemoHostname(hostname: string) {
  return hostname.toLowerCase() === "demo.mend.local";
}

export function isBlockedAddress(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");

  if (
    blockedHostnames.has(normalized) ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local")
  ) {
    return true;
  }

  const version = net.isIP(normalized);

  if (version === 4) {
    return isBlockedIpv4(normalized);
  }

  if (version === 6) {
    return isBlockedIpv6(normalized);
  }

  return false;
}

function isBlockedIpv4(value: string) {
  const parts = value.split(".").map(Number);

  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return true;
  }

  const [first, second] = parts;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51 && parts[2] === 100) ||
    (first === 203 && second === 0 && parts[2] === 113) ||
    first >= 224
  );
}

function isBlockedIpv6(value: string) {
  const normalized = value.toLowerCase();

  if (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80") ||
    normalized.startsWith("ff")
  ) {
    return true;
  }

  if (normalized.startsWith("::ffff:")) {
    return isBlockedIpv4(normalized.slice("::ffff:".length));
  }

  return false;
}
