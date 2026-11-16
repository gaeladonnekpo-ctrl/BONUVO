export const LOCALES = ["fr", "en"] as const;
export type AppLocale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "fr";

export function isSupportedLocale(value: string): value is AppLocale {
  return (LOCALES as readonly string[]).includes(value);
}
