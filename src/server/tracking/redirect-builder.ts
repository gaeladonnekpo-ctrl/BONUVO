import "server-only";

import { validateAffiliateUrl } from "@/modules/offers/url-guard";

export interface BuiltPartnerRedirect {
  valid: boolean;
  url: string | null;
  reason?: string;
}

/**
 * Builds the final partner 302 Location strictly from the DB-stored destination URL
 * and allowed_hosts, injecting only BONUVO's opaque click UUID into the configured subid param.
 */
export function buildPartnerRedirectUrl(params: {
  destinationUrl: string;
  allowedHosts: readonly string[];
  subIdParamName?: string | null;
  publicClickId: string;
}): BuiltPartnerRedirect {
  const check = validateAffiliateUrl(params.destinationUrl, params.allowedHosts);
  if (!check.valid || !check.normalizedUrl) {
    return { valid: false, url: null, reason: check.reason ?? "HOST_OR_SCHEME_REJECTED" };
  }

  let parsed: URL;
  try {
    parsed = new URL(check.normalizedUrl);
  } catch {
    return { valid: false, url: null, reason: "INVALID_STORED_URL" };
  }

  const rawParam = (params.subIdParamName ?? "subid").trim();
  const safeParam = /^[a-zA-Z0-9_-]{1,40}$/.test(rawParam) ? rawParam : "subid";
  parsed.searchParams.set(safeParam, params.publicClickId);

  return {
    valid: true,
    url: parsed.toString(),
  };
}
