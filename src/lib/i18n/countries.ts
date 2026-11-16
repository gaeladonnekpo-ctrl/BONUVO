export type ContinentKey = "global" | "africa" | "europe" | "americas" | "asia" | "oceania";

export interface CountryOption {
  readonly code: string;
  readonly continent: ContinentKey;
  readonly currency: string;
  readonly defaultLocale: "fr" | "en";
}

export const COUNTRY_COOKIE_NAME = "bonuvo_country";
export const THEME_COOKIE_NAME = "bonuvo_theme";

export const DEFAULT_COUNTRY_CODE = "GLOBAL";

/**
 * Representative multi-continent directory for the Phase 1 country switcher UI.
 * Real per-country eligibility and geo-IP resolution will be wired to PostgreSQL in Phases 3-4.
 */
export const COUNTRY_OPTIONS: readonly CountryOption[] = [
  { code: "GLOBAL", continent: "global", currency: "EUR", defaultLocale: "fr" },
  { code: "BJ", continent: "africa", currency: "XOF", defaultLocale: "fr" },
  { code: "CI", continent: "africa", currency: "XOF", defaultLocale: "fr" },
  { code: "SN", continent: "africa", currency: "XOF", defaultLocale: "fr" },
  { code: "CM", continent: "africa", currency: "XAF", defaultLocale: "fr" },
  { code: "CD", continent: "africa", currency: "CDF", defaultLocale: "fr" },
  { code: "MA", continent: "africa", currency: "MAD", defaultLocale: "fr" },
  { code: "NG", continent: "africa", currency: "NGN", defaultLocale: "en" },
  { code: "ZA", continent: "africa", currency: "ZAR", defaultLocale: "en" },
  { code: "FR", continent: "europe", currency: "EUR", defaultLocale: "fr" },
  { code: "BE", continent: "europe", currency: "EUR", defaultLocale: "fr" },
  { code: "CH", continent: "europe", currency: "CHF", defaultLocale: "fr" },
  { code: "GB", continent: "europe", currency: "GBP", defaultLocale: "en" },
  { code: "ES", continent: "europe", currency: "EUR", defaultLocale: "en" },
  { code: "CA", continent: "americas", currency: "CAD", defaultLocale: "fr" },
  { code: "BR", continent: "americas", currency: "BRL", defaultLocale: "en" },
  { code: "MX", continent: "americas", currency: "MXN", defaultLocale: "en" },
  { code: "IN", continent: "asia", currency: "INR", defaultLocale: "en" },
  { code: "AU", continent: "oceania", currency: "AUD", defaultLocale: "en" },
] as const;

export const SUPPORTED_COUNTRY_CODES = new Set(COUNTRY_OPTIONS.map((c) => c.code));

export function normalizeCountryCode(value: string | undefined | null): string {
  if (!value) {
    return DEFAULT_COUNTRY_CODE;
  }
  const upper = value.trim().toUpperCase();
  return SUPPORTED_COUNTRY_CODES.has(upper) ? upper : DEFAULT_COUNTRY_CODE;
}
