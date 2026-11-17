import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { AdapterVerifyContext, AdapterVerifyResult } from "./types";

const SAFE_SECRET_ENV_REGEX = /^AFFILIATE_[A-Z0-9_]{2,64}$/;
const SENSITIVE_PARAM_KEYS = new Set([
  "token",
  "secret",
  "sig",
  "signature",
  "authorization",
  "cookie",
  "x-postback-token",
  "x-webhook-secret",
  "x-signature",
  "x-hub-signature",
  "x-hub-signature-256",
]);

export function resolveAffiliateSecret(secretEnvRef: string): string | null {
  const trimmed = secretEnvRef.trim();
  if (!SAFE_SECRET_ENV_REGEX.test(trimmed)) return null;
  const val = process.env[trimmed];
  return typeof val === "string" && val.trim().length > 0 ? val.trim() : null;
}

export function timingSafeEqualStrings(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a, "utf8").digest();
  const hashB = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(hashA, hashB);
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n < 0 || n > 255) return null;
    value = (value << 8) | n;
  }
  return value >>> 0;
}

export function isIpInAllowlist(clientIp: string, allowlist: readonly string[]): boolean {
  if (allowlist.length === 0) return true;
  const normalizedIp = clientIp.trim();
  if (!normalizedIp) return false;

  const clientV4 = ipv4ToInt(normalizedIp);
  for (const rawEntry of allowlist) {
    const entry = rawEntry.trim();
    if (!entry) continue;
    if (entry === normalizedIp) return true;

    const [cidrBase, maskBitsRaw] = entry.split("/");
    if (cidrBase && maskBitsRaw && clientV4 !== null) {
      const baseV4 = ipv4ToInt(cidrBase);
      const bits = Number(maskBitsRaw);
      if (baseV4 !== null && Number.isInteger(bits) && bits >= 0 && bits <= 32) {
        const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
        if ((clientV4 & mask) === (baseV4 & mask)) return true;
      }
    }
  }
  return false;
}

export function parseAndValidateTimestamp(
  rawTimestamp: string | undefined,
  toleranceSeconds: number,
  now = new Date(),
): { ok: boolean; date: Date | null; reason: string } {
  if (!rawTimestamp || !rawTimestamp.trim()) {
    return { ok: true, date: null, reason: "" };
  }

  const trimmed = rawTimestamp.trim();
  let parsedDate: Date | null = null;
  if (/^\d{10}$/.test(trimmed)) {
    parsedDate = new Date(Number(trimmed) * 1000);
  } else if (/^\d{13}$/.test(trimmed)) {
    parsedDate = new Date(Number(trimmed));
  } else {
    const d = new Date(trimmed);
    if (!Number.isNaN(d.getTime())) parsedDate = d;
  }

  if (!parsedDate) {
    return { ok: false, date: null, reason: "invalid_timestamp_format" };
  }

  const diffSeconds = (now.getTime() - parsedDate.getTime()) / 1000;
  if (diffSeconds > toleranceSeconds || diffSeconds < -60) {
    return { ok: false, date: parsedDate, reason: "timestamp_outside_window" };
  }

  return { ok: true, date: parsedDate, reason: "" };
}

function buildCanonicalQueryString(query: Record<string, string>): string {
  return Object.keys(query)
    .filter((k) => k !== "sig" && k !== "signature" && k !== "hmac")
    .sort()
    .map((k) => `${k}=${query[k] ?? ""}`)
    .join("&");
}

function normalizeHexDigest(rawSignature: string): string {
  return rawSignature
    .trim()
    .replace(/^sha256=/i, "")
    .toLowerCase();
}

export function verifyPartnerRequest(ctx: AdapterVerifyContext): AdapterVerifyResult {
  if (!isIpInAllowlist(ctx.clientIp, ctx.network.allowedIps)) {
    return { ok: false, status: 403, reason: "ip_not_allowlisted", eventTimestamp: null };
  }

  if (ctx.network.signatureMode === "none") {
    return { ok: false, status: 401, reason: "signature_required", eventTimestamp: null };
  }

  const secret = resolveAffiliateSecret(ctx.network.secretEnvRef);
  if (!secret) {
    return {
      ok: false,
      status: 503,
      reason: "network_secret_not_configured",
      eventTimestamp: null,
    };
  }

  const rawTs =
    ctx.headers["x-timestamp"] ??
    ctx.headers["webhook-timestamp"] ??
    ctx.query.ts ??
    ctx.query.timestamp;
  const tsCheck = parseAndValidateTimestamp(rawTs, ctx.network.timestampToleranceSeconds, ctx.now);
  if (!tsCheck.ok) {
    return { ok: false, status: 401, reason: tsCheck.reason, eventTimestamp: tsCheck.date };
  }

  if (ctx.network.signatureMode === "token") {
    const authHeader = ctx.headers.authorization ?? "";
    const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
    const provided =
      (ctx.network.signatureHeader ? ctx.headers[ctx.network.signatureHeader.toLowerCase()] : "") ||
      ctx.headers["x-postback-token"] ||
      ctx.headers["x-webhook-secret"] ||
      bearer ||
      ctx.query.token ||
      ctx.query.secret ||
      "";

    if (!provided || !timingSafeEqualStrings(provided, secret)) {
      return { ok: false, status: 401, reason: "invalid_token", eventTimestamp: tsCheck.date };
    }
    return { ok: true, status: 200, reason: "", eventTimestamp: tsCheck.date };
  }

  const headerName = ctx.network.signatureHeader.toLowerCase();
  const providedSig =
    (headerName ? ctx.headers[headerName] : "") ||
    ctx.headers["x-signature"] ||
    ctx.headers["x-webhook-signature"] ||
    ctx.headers["x-hub-signature-256"] ||
    ctx.query.sig ||
    ctx.query.signature ||
    ctx.query.hmac ||
    "";

  if (!providedSig) {
    return {
      ok: false,
      status: 401,
      reason: "missing_hmac_signature",
      eventTimestamp: tsCheck.date,
    };
  }

  const payloadToSign =
    ctx.method === "POST" && ctx.rawBody.length > 0
      ? rawTs && ctx.headers["x-timestamp"]
        ? `${rawTs}.${ctx.rawBody}`
        : ctx.rawBody
      : buildCanonicalQueryString(ctx.query);

  const expectedHex = createHmac("sha256", secret).update(payloadToSign, "utf8").digest("hex");
  const expectedNoTs = createHmac("sha256", secret)
    .update(ctx.method === "POST" ? ctx.rawBody : buildCanonicalQueryString(ctx.query), "utf8")
    .digest("hex");

  const actualHex = normalizeHexDigest(providedSig);
  const valid =
    timingSafeEqualStrings(actualHex, expectedHex) ||
    timingSafeEqualStrings(actualHex, expectedNoTs);

  if (!valid) {
    return {
      ok: false,
      status: 401,
      reason: "invalid_hmac_signature",
      eventTimestamp: tsCheck.date,
    };
  }

  return { ok: true, status: 200, reason: "", eventTimestamp: tsCheck.date };
}

export function sanitizeRecordForStorage(record: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    const lower = key.toLowerCase();
    sanitized[key] = SENSITIVE_PARAM_KEYS.has(lower) ? "[REDACTED]" : value.slice(0, 500);
  }
  return sanitized;
}
