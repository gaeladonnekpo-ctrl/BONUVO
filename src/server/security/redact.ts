import "server-only";

const SENSITIVE_KEYS = new Set([
  "password",
  "newpassword",
  "currentpassword",
  "confirmpassword",
  "token",
  "tokenhash",
  "accesstoken",
  "refreshtoken",
  "idtoken",
  "secret",
  "iphashsecret",
  "webhooksecret",
  "signingsecret",
  "servicerolekey",
  "apikey",
  "cookie",
  "cookies",
  "setcookie",
  "authorization",
  "otp",
  "otpcode",
  "totpcode",
  "totpsecret",
]);

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isSensitiveKey(key: string): boolean {
  const normalized = normalizeKey(key);
  if (SENSITIVE_KEYS.has(normalized)) return true;
  return (
    normalized.includes("password") ||
    normalized.includes("secret") ||
    normalized.includes("cookie") ||
    normalized.includes("authorization") ||
    normalized.endsWith("token") ||
    normalized.endsWith("apikey")
  );
}

export function redactStringSecrets(input: string): string {
  return input
    .replace(/(postgres(?:ql)?:\/\/[^:\s]+:)[^@\s]+@/gi, "$1[REDACTED]@")
    .replace(/\b(Bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi, "$1[REDACTED]")
    .replace(/\b(re|sb_secret|whsec)_[A-Za-z0-9_-]{8,}/g, "$1_[REDACTED]");
}

export function redactValue(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[TRUNCATED]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return redactStringSecrets(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, depth + 1));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = isSensitiveKey(k) ? "[REDACTED]" : redactValue(v, depth + 1);
    }
    return out;
  }
  return String(value);
}

export function redactRecord(
  record: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!record) return null;
  return redactValue(record, 0) as Record<string, unknown>;
}
