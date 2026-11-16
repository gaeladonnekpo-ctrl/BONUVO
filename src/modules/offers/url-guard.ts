const HOST_REGEX = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i;

const PRIVATE_OR_LOCAL_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^\[?::1\]?$/i,
  /^\[?fe80:/i,
  /\.local$/i,
  /\.internal$/i,
];

export function normalizeAllowedHost(rawHost: string): string | null {
  const trimmed = rawHost
    .trim()
    .toLowerCase()
    .replace(/^\.+|\.+$/g, "");
  if (!trimmed || !HOST_REGEX.test(trimmed)) {
    return null;
  }
  if (PRIVATE_OR_LOCAL_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return null;
  }
  return trimmed;
}

export function normalizeAllowedHostsList(hosts: readonly string[]): string[] {
  const unique = new Set<string>();
  for (const host of hosts) {
    const normalized = normalizeAllowedHost(host);
    if (normalized) {
      unique.add(normalized);
    }
  }
  return [...unique];
}

export interface AffiliateUrlCheckResult {
  valid: boolean;
  normalizedUrl?: string;
  matchedHost?: string;
  reason?: string;
}

/**
 * Control B1: ensures affiliate destination URLs use HTTPS without embedded credentials,
 * never target local/private addresses, and match the bookmaker's `allowedHosts`.
 */
export function validateAffiliateUrl(
  rawUrl: string,
  allowedHosts: readonly string[],
): AffiliateUrlCheckResult {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { valid: false, reason: "EMPTY_URL" };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, reason: "INVALID_URL" };
  }

  if (parsed.protocol !== "https:") {
    return { valid: false, reason: "HTTPS_REQUIRED" };
  }
  if (parsed.username || parsed.password) {
    return { valid: false, reason: "CREDENTIALS_FORBIDDEN" };
  }

  const host = parsed.hostname.toLowerCase();
  if (PRIVATE_OR_LOCAL_PATTERNS.some((pattern) => pattern.test(host))) {
    return { valid: false, reason: "PRIVATE_HOST_FORBIDDEN" };
  }

  const normalizedAllowed = normalizeAllowedHostsList(allowedHosts);
  const matched = normalizedAllowed.find(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`),
  );
  if (!matched) {
    return { valid: false, reason: "HOST_NOT_ALLOWED" };
  }

  return {
    valid: true,
    normalizedUrl: parsed.toString(),
    matchedHost: host,
  };
}
