import { createHmac, timingSafeEqual } from "node:crypto";

export type UnsubscribeScope = "all" | "marketing_email" | "notifications";

export type UnsubscribePayload = {
  userId: string;
  scope: UnsubscribeScope;
  issuedAt: number;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const VALID_SCOPES = new Set<UnsubscribeScope>(["all", "marketing_email", "notifications"]);

function resolveSigningSecret(explicitSecret?: string): string {
  const secret =
    explicitSecret ??
    process.env.IP_HASH_SECRET ??
    "bonuvo-dev-unsubscribe-fallback-secret-32chars";
  return secret;
}

function computeSignature(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

/**
 * Génère un jeton signé HMAC-SHA256 permettant la désinscription en 1 clic sans connexion.
 */
export function createUnsubscribeToken(
  payload: {
    userId: string;
    scope?: UnsubscribeScope;
    issuedAt?: number;
  },
  secret?: string,
): string {
  if (!UUID_REGEX.test(payload.userId)) {
    throw new Error("INVALID_USER_ID");
  }

  const normalized: UnsubscribePayload = {
    userId: payload.userId.toLowerCase(),
    scope: payload.scope ?? "all",
    issuedAt: payload.issuedAt ?? Date.now(),
  };

  const encodedPayload = Buffer.from(JSON.stringify(normalized), "utf8").toString("base64url");
  const signature = computeSignature(encodedPayload, resolveSigningSecret(secret));
  return `${encodedPayload}.${signature}`;
}

/**
 * Vérifie en temps constant un jeton de désinscription 1-clic.
 */
export function verifyUnsubscribeToken(
  token: string,
  options?: { secret?: string; maxAgeMs?: number; nowMs?: number },
): { valid: true; payload: UnsubscribePayload } | { valid: false; reason: string } {
  if (!token || typeof token !== "string") {
    return { valid: false, reason: "EMPTY_TOKEN" };
  }

  const parts = token.trim().split(".");
  if (parts.length !== 2) {
    return { valid: false, reason: "MALFORMED_TOKEN" };
  }

  const [encodedPayload, providedSignature] = parts;
  if (!encodedPayload || !providedSignature) {
    return { valid: false, reason: "MALFORMED_TOKEN" };
  }

  const expectedSignature = computeSignature(encodedPayload, resolveSigningSecret(options?.secret));

  const providedBuf = Buffer.from(providedSignature, "utf8");
  const expectedBuf = Buffer.from(expectedSignature, "utf8");
  if (providedBuf.length !== expectedBuf.length || !timingSafeEqual(providedBuf, expectedBuf)) {
    return { valid: false, reason: "INVALID_SIGNATURE" };
  }

  let parsed: unknown;
  try {
    const json = Buffer.from(encodedPayload, "base64url").toString("utf8");
    parsed = JSON.parse(json);
  } catch {
    return { valid: false, reason: "INVALID_PAYLOAD_JSON" };
  }

  if (!parsed || typeof parsed !== "object") {
    return { valid: false, reason: "INVALID_PAYLOAD" };
  }

  const candidate = parsed as Partial<UnsubscribePayload>;
  if (!candidate.userId || !UUID_REGEX.test(candidate.userId)) {
    return { valid: false, reason: "INVALID_USER_ID" };
  }

  if (!candidate.scope || !VALID_SCOPES.has(candidate.scope)) {
    return { valid: false, reason: "INVALID_SCOPE" };
  }

  if (typeof candidate.issuedAt !== "number" || !Number.isFinite(candidate.issuedAt)) {
    return { valid: false, reason: "INVALID_ISSUED_AT" };
  }

  const maxAgeMs = options?.maxAgeMs ?? 180 * 24 * 60 * 60 * 1000; // 180 jours par défaut
  const nowMs = options?.nowMs ?? Date.now();
  if (nowMs - candidate.issuedAt > maxAgeMs) {
    return { valid: false, reason: "TOKEN_EXPIRED" };
  }

  return {
    valid: true,
    payload: {
      userId: candidate.userId.toLowerCase(),
      scope: candidate.scope,
      issuedAt: candidate.issuedAt,
    },
  };
}

/**
 * Calcule l'échéance de purge différée à +14 jours exactement.
 */
export function computeScheduledPurgeDate(requestedAt: Date = new Date()): Date {
  const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
  return new Date(requestedAt.getTime() + FOURTEEN_DAYS_MS);
}
