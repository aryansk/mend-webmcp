import { describe, expect, it } from "vitest";
import {
  createWorkspaceReceipt,
  requestHasWorkspaceReceipt,
  serializeWorkspaceReceiptCookie,
} from "../../lib/workspace/receipts";

describe("workspace receipts", () => {
  it("binds a signed approval receipt to its kind and fix", () => {
    const receipt = createWorkspaceReceipt("approval", "fix_demo_issue_img_alt");
    expect(receipt).toBeTruthy();

    const request = new Request("http://localhost/api/fixes/apply", {
      headers: { Cookie: "mend_approval_receipt=" + receipt },
    });

    expect(
      requestHasWorkspaceReceipt(
        request,
        "approval",
        "fix_demo_issue_img_alt",
      ),
    ).toBe(true);
    expect(
      requestHasWorkspaceReceipt(request, "applied", "fix_demo_issue_img_alt"),
    ).toBe(false);
    expect(
      requestHasWorkspaceReceipt(request, "approval", "fix_demo_other_issue"),
    ).toBe(false);
  });

  it("rejects a tampered receipt and emits a restricted cookie", () => {
    const receipt = createWorkspaceReceipt("approval", "fix_demo_issue_img_alt")!;
    const tampered = receipt.slice(0, -1) + (receipt.endsWith("a") ? "b" : "a");
    const request = new Request("http://localhost/api/fixes/apply", {
      headers: { Cookie: "mend_approval_receipt=" + tampered },
    });
    const cookie = serializeWorkspaceReceiptCookie("approval", receipt);

    expect(
      requestHasWorkspaceReceipt(
        request,
        "approval",
        "fix_demo_issue_img_alt",
      ),
    ).toBe(false);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Max-Age=86400");
  });
});
