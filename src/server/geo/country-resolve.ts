import "server-only";

import { COUNTRY_COOKIE_NAME, DEFAULT_COUNTRY_CODE } from "@/lib/i18n/countries";

const ISO_CODE_REGEX = /^[A-Z]{2,8}$/;

export function parseRawCountryCandidate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const upper = raw.trim().toUpperCase();
  if (!ISO_CODE_REGEX.test(upper)) return null;
  if (upper === "XX" || upper === "T1") return null;
  return upper;
}

export interface DetectedCountryInput {
  queryCountry?: string | null;
  cookieCountry?: string | null;
  headerCountry?: string | null;
}

export type CountryResolutionSource = "query" | "cookie" | "header" | "default";

export function detectVisitorCountryCode(input: DetectedCountryInput): {
  code: string;
  source: CountryResolutionSource;
} {
  const fromQuery = parseRawCountryCandidate(input.queryCountry);
  if (fromQuery) return { code: fromQuery, source: "query" };

  const fromCookie = parseRawCountryCandidate(input.cookieCountry);
  if (fromCookie) return { code: fromCookie, source: "cookie" };

  const fromHeader = parseRawCountryCandidate(input.headerCountry);
  if (fromHeader) return { code: fromHeader, source: "header" };

  return { code: DEFAULT_COUNTRY_CODE, source: "default" };
}

export function extractGeoHeaderCountry(headers: Pick<Headers, "get">): string | null {
  return (
    parseRawCountryCandidate(headers.get("x-vercel-ip-country")) ??
    parseRawCountryCandidate(headers.get("cf-ipcountry"))
  );
}

export function extractCookieCountry(cookieGetter: {
  get(name: string): { value: string } | undefined;
}): string | null {
  return parseRawCountryCandidate(cookieGetter.get(COUNTRY_COOKIE_NAME)?.value);
}
