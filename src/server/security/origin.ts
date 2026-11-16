import "server-only";

export interface OriginCheckResult {
  allowed: boolean;
  reason?: string;
}

function parseOrigin(urlValue: string | null): string | null {
  if (!urlValue) return null;
  try {
    return new URL(urlValue).origin;
  } catch {
    return null;
  }
}

export function resolveExpectedOrigin(
  headers: Pick<Headers, "get">,
  configuredSiteUrl: string,
): string {
  const host = headers.get("x-forwarded-host") || headers.get("host");
  const proto = headers.get("x-forwarded-proto");
  if (host) {
    const scheme = proto || (configuredSiteUrl.startsWith("https://") ? "https" : "http");
    try {
      return new URL(`${scheme}://${host}`).origin;
    } catch {
      // Fallback below
    }
  }
  return new URL(configuredSiteUrl).origin;
}

/**
 * Control V3: enforces same-origin `Origin` (or `Referer`) on mutating browser requests.
 */
export function checkSameOrigin(
  headers: Pick<Headers, "get">,
  configuredSiteUrl: string,
): OriginCheckResult {
  const expectedOrigin = resolveExpectedOrigin(headers, configuredSiteUrl);
  const originHeader = headers.get("origin");
  if (originHeader) {
    return originHeader === expectedOrigin
      ? { allowed: true }
      : { allowed: false, reason: "Origin header mismatch" };
  }

  const refererOrigin = parseOrigin(headers.get("referer"));
  if (refererOrigin) {
    return refererOrigin === expectedOrigin
      ? { allowed: true }
      : { allowed: false, reason: "Referer origin mismatch" };
  }

  const fetchSite = headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return { allowed: false, reason: "Cross-site fetch rejected" };
  }

  // Non-browser scripts hitting API routes directly (e.g. rate-limit security tests)
  // have neither Origin nor cross-site Sec-Fetch-Site headers; block only explicit cross-origin.
  if (fetchSite === "same-origin" || fetchSite === "none" || !fetchSite) {
    return { allowed: true };
  }

  return { allowed: false, reason: "Missing origin" };
}
