import { ISO_3166_ALPHA2_CODES } from "@/lib/i18n/iso-countries";

export type ContinentKey = "global" | "africa" | "europe" | "americas" | "asia" | "oceania";

export interface CountryOption {
  readonly code: string;
  readonly continent: ContinentKey;
  readonly currency: string;
  readonly defaultLocale: "fr" | "en";
  readonly nameFr?: string;
  readonly nameEn?: string;
}

export const COUNTRY_COOKIE_NAME = "bonuvo_country";
export const THEME_COOKIE_NAME = "bonuvo_theme";

export const DEFAULT_COUNTRY_CODE = "GLOBAL";

/**
 * Fallback curated country directory when DB list is not explicitly passed.
 * Live public routes pass active DB countries (up to all 249 ISO 3166-1 territories).
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
  { code: "KE", continent: "africa", currency: "KES", defaultLocale: "en" },
  { code: "GH", continent: "africa", currency: "GHS", defaultLocale: "en" },
  { code: "FR", continent: "europe", currency: "EUR", defaultLocale: "fr" },
  { code: "BE", continent: "europe", currency: "EUR", defaultLocale: "fr" },
  { code: "CH", continent: "europe", currency: "CHF", defaultLocale: "fr" },
  { code: "GB", continent: "europe", currency: "GBP", defaultLocale: "en" },
  { code: "ES", continent: "europe", currency: "EUR", defaultLocale: "en" },
  { code: "CA", continent: "americas", currency: "CAD", defaultLocale: "fr" },
  { code: "US", continent: "americas", currency: "USD", defaultLocale: "en" },
  { code: "BR", continent: "americas", currency: "BRL", defaultLocale: "en" },
  { code: "MX", continent: "americas", currency: "MXN", defaultLocale: "en" },
  { code: "IN", continent: "asia", currency: "INR", defaultLocale: "en" },
  { code: "AU", continent: "oceania", currency: "AUD", defaultLocale: "en" },
] as const;

export const SUPPORTED_COUNTRY_CODES = new Set([DEFAULT_COUNTRY_CODE, ...ISO_3166_ALPHA2_CODES]);

export function normalizeCountryCode(value: string | undefined | null): string {
  if (!value) {
    return DEFAULT_COUNTRY_CODE;
  }
  const upper = value.trim().toUpperCase();
  return SUPPORTED_COUNTRY_CODES.has(upper) ? upper : DEFAULT_COUNTRY_CODE;
}

export function formatCountryDisplay(
  item: CountryOption,
  locale: "fr" | "en",
  globalLabel: string,
): string {
  if (item.code === "GLOBAL") return globalLabel;
  const localized = locale === "en" ? item.nameEn : item.nameFr;
  if (localized) return localized;
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(item.code) ?? item.code;
  } catch {
    return item.code;
  }
}
