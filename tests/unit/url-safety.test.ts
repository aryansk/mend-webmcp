import { describe, expect, it } from "vitest";
import { AuditError } from "../../lib/audit/errors";
import {
  isBlockedAddress,
  normalizeTargetUrl,
} from "../../lib/audit/url-safety";

describe("audit URL safety", () => {
  it("blocks private, loopback, and link-local addresses", () => {
    expect(isBlockedAddress("127.0.0.1")).toBe(true);
    expect(isBlockedAddress("10.0.0.8")).toBe(true);
    expect(isBlockedAddress("192.168.1.4")).toBe(true);
    expect(isBlockedAddress("169.254.169.254")).toBe(true);
    expect(isBlockedAddress("::1")).toBe(true);
    expect(isBlockedAddress("203.0.113.10")).toBe(true);
  });

  it("rejects unsafe URL forms before any fetch occurs", () => {
    expect(() => normalizeTargetUrl("http://127.0.0.1:3000")).toThrowError(
      AuditError,
    );
    expect(() => normalizeTargetUrl("file:///etc/passwd")).toThrowError(
      AuditError,
    );
    expect(() => normalizeTargetUrl("https://user:pass@example.com")).toThrowError(
      AuditError,
    );
  });

  it("accepts public URLs and the controlled demo target", () => {
    expect(normalizeTargetUrl("https://example.com/#intro").toString()).toBe(
      "https://example.com/",
    );
    expect(normalizeTargetUrl("https://demo.mend.local").hostname).toBe(
      "demo.mend.local",
    );
  });
});
