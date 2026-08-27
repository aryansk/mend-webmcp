import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type WorkspaceReceiptKind = "approval" | "applied";

export const APPROVAL_RECEIPT_COOKIE = "mend_approval_receipt";
export const APPLIED_RECEIPT_COOKIE = "mend_applied_receipt";

const RECEIPT_TTL_SECONDS = 24 * 60 * 60;
const localSecret = randomBytes(32).toString("hex");

type ReceiptPayload = {
  version: 1;
  kind: WorkspaceReceiptKind;
  fixId: string;
  expiresAt: number;
};

export function createWorkspaceReceipt(
  kind: WorkspaceReceiptKind,
  fixId: string,
) {
  const secret = getWorkspaceSecret();

  if (!secret) {
    return null;
  }

  const payload: ReceiptPayload = {
    version: 1,
    kind,
    fixId,
    expiresAt: Math.floor(Date.now() / 1000) + RECEIPT_TTL_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(encodedPayload, secret);

  return encodedPayload + "." + signature;
}

export function requestHasWorkspaceReceipt(
  request: Request,
  kind: WorkspaceReceiptKind,
  fixId: string,
) {
  const cookieName =
    kind === "approval" ? APPROVAL_RECEIPT_COOKIE : APPLIED_RECEIPT_COOKIE;
  const receipt = readCookie(request.headers.get("cookie"), cookieName);

  return receipt ? verifyWorkspaceReceipt(receipt, kind, fixId) : false;
}

export function serializeWorkspaceReceiptCookie(
  kind: WorkspaceReceiptKind,
  receipt: string,
) {
  const name =
    kind === "approval" ? APPROVAL_RECEIPT_COOKIE : APPLIED_RECEIPT_COOKIE;
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

  return (
    name +
    "=" +
    receipt +
    "; Path=/; HttpOnly; SameSite=Lax; Max-Age=" +
    RECEIPT_TTL_SECONDS +
    secure
  );
}

export function serializeClearedWorkspaceReceiptCookie(
  kind: WorkspaceReceiptKind,
) {
  const name =
    kind === "approval" ? APPROVAL_RECEIPT_COOKIE : APPLIED_RECEIPT_COOKIE;
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

  return name + "=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0" + secure;
}

function verifyWorkspaceReceipt(
  receipt: string,
  expectedKind: WorkspaceReceiptKind,
  expectedFixId: string,
) {
  const secret = getWorkspaceSecret();

  if (!secret) {
    return false;
  }

  const separator = receipt.lastIndexOf(".");

  if (separator <= 0) {
    return false;
  }

  const encodedPayload = receipt.slice(0, separator);
  const suppliedSignature = receipt.slice(separator + 1);
  const expectedSignature = sign(encodedPayload, secret);
  const suppliedBuffer = Buffer.from(suppliedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    suppliedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(suppliedBuffer, expectedBuffer)
  ) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<ReceiptPayload>;

    return (
      payload.version === 1 &&
      payload.kind === expectedKind &&
      payload.fixId === expectedFixId &&
      typeof payload.expiresAt === "number" &&
      payload.expiresAt >= Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function getWorkspaceSecret() {
  const configured = process.env.MEND_WORKSPACE_SECRET?.trim();

  if (configured && Buffer.byteLength(configured, "utf8") >= 32) {
    return configured;
  }

  return process.env.NODE_ENV === "production" ? null : localSecret;
}

function readCookie(cookieHeader: string | null, name: string) {
  if (!cookieHeader) {
    return undefined;
  }

  for (const part of cookieHeader.split(";")) {
    const [key, ...valueParts] = part.trim().split("=");

    if (key === name) {
      return valueParts.join("=");
    }
  }

  return undefined;
}
