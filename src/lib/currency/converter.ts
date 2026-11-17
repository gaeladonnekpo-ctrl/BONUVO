export const DEFAULT_EUR_EXCHANGE_RATES: Readonly<Record<string, number>> = {
  EUR: 1,
  XOF: 655.957,
  XAF: 655.957,
  NGN: 1475,
  CDF: 2590,
  MAD: 10.95,
  ZAR: 18.7,
  KES: 139,
  GHS: 16.5,
  TZS: 2850,
  UGX: 3980,
  RWF: 1480,
  ZMW: 28.5,
  GNF: 9250,
  DZD: 145,
  TND: 3.35,
  EGP: 53.5,
  MZN: 68.5,
  MGA: 4920,
  ETB: 132,
  AOA: 985,
  BWP: 14.8,
  NAD: 18.7,
  MUR: 49.5,
  GBP: 0.835,
  CHF: 0.94,
  NOK: 11.7,
  SEK: 11.4,
  DKK: 7.46,
  PLN: 4.32,
  RON: 4.97,
  CZK: 25.3,
  HUF: 406,
  BGN: 1.956,
  TRY: 37.2,
  UAH: 44.5,
  RSD: 117,
  USD: 1.08,
  CAD: 1.5,
  BRL: 6.22,
  MXN: 21.5,
  ARS: 1080,
  COP: 4650,
  CLP: 1030,
  PEN: 4.05,
  UYU: 45.5,
  INR: 103.5,
  PKR: 300,
  BDT: 129,
  PHP: 63.2,
  IDR: 17150,
  VND: 27400,
  THB: 37.5,
  MYR: 4.82,
  SGD: 1.45,
  JPY: 166,
  KRW: 1510,
  CNY: 7.82,
  HKD: 8.4,
  AED: 3.97,
  SAR: 4.05,
  QAR: 3.93,
  KZT: 530,
  UZS: 13800,
  AUD: 1.65,
  NZD: 1.81,
};

const HIGH_DENOMINATION_CURRENCIES = new Set([
  "XOF",
  "XAF",
  "NGN",
  "CDF",
  "INR",
  "MXN",
  "KES",
  "TZS",
  "UGX",
  "RWF",
  "GNF",
  "DZD",
  "MGA",
  "ETB",
  "AOA",
  "HUF",
  "ARS",
  "COP",
  "CLP",
  "PKR",
  "BDT",
  "IDR",
  "VND",
  "JPY",
  "KRW",
  "KZT",
  "UZS",
]);

const CURRENCY_TEXT_PATTERN =
  /((?:\d{1,3}(?:[\s\u00A0\u202F,]\d{3})+|\d+)(?:[.,]\d{1,2})?)(?:\s*([–-])\s*((?:\d{1,3}(?:[\s\u00A0\u202F,]\d{3})+|\d+)(?:[.,]\d{1,2})?))?\s*(FCFA|EUR|XOF|XAF|NGN|CDF|MAD|ZAR|KES|GHS|TZS|UGX|RWF|ZMW|GNF|DZD|TND|EGP|USD|GBP|CAD|CHF|NOK|SEK|DKK|PLN|RON|TRY|BRL|MXN|ARS|COP|CLP|PEN|INR|PKR|BDT|PHP|IDR|VND|THB|AUD|NZD|JPY|KRW)\b/gi;

export function normalizeCurrencyAlias(code: string): string {
  const upper = code.trim().toUpperCase();
  return upper === "FCFA" ? "XOF" : upper;
}

export function roundCurrencyForDisplay(value: number, targetCurrency: string): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const target = normalizeCurrencyAlias(targetCurrency);

  if (HIGH_DENOMINATION_CURRENCIES.has(target)) {
    if (value < 100) return Math.max(10, Math.round(value / 10) * 10);
    if (value < 2_000) return Math.round(value / 50) * 50;
    if (value < 20_000) return Math.round(value / 100) * 100;
    if (value < 150_000) return Math.round(value / 1_000) * 1_000;
    return Math.round(value / 5_000) * 5_000;
  }

  if (value < 10) return Math.max(1, Math.round(value));
  if (value < 100) return Math.round(value);
  return Math.round(value / 5) * 5;
}

export function convertCurrencyAmount(params: {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  rates?: Readonly<Record<string, number>>;
  roundForDisplay?: boolean;
}): number {
  const from = normalizeCurrencyAlias(params.fromCurrency);
  const to = normalizeCurrencyAlias(params.toCurrency);
  if (!Number.isFinite(params.amount)) return 0;
  if (from === to) return params.amount;

  if ((from === "XOF" && to === "XAF") || (from === "XAF" && to === "XOF")) {
    return params.amount;
  }

  const rates = params.rates ?? DEFAULT_EUR_EXCHANGE_RATES;
  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate || fromRate <= 0 || toRate <= 0) {
    return params.amount;
  }

  const raw = (params.amount / fromRate) * toRate;
  return params.roundForDisplay === false ? raw : roundCurrencyForDisplay(raw, to);
}

export function formatCurrencyAmount(
  amount: number,
  currencyCode: string,
  locale: "fr" | "en",
): string {
  const formatted = new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR", {
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
  return `${formatted} ${normalizeCurrencyAlias(currencyCode)}`;
}

function parseMatchedNumeric(raw: string): number | null {
  let cleaned = raw.replace(/[\s\u00A0\u202F]/g, "");
  if (cleaned.includes(",") && cleaned.includes(".")) {
    cleaned = cleaned.replace(/,/g, "");
  } else if (cleaned.includes(",")) {
    const parts = cleaned.split(",");
    cleaned =
      parts.length === 2 && parts[1]!.length === 2
        ? cleaned.replace(",", ".")
        : cleaned.replace(/,/g, "");
  }
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function localizeFinancialText(params: {
  text: string;
  targetCurrency: string;
  locale: "fr" | "en";
  rates?: Readonly<Record<string, number>>;
}): string {
  if (!params.text) return params.text;
  const target = normalizeCurrencyAlias(params.targetCurrency);

  return params.text.replace(
    CURRENCY_TEXT_PATTERN,
    (
      fullMatch,
      rawFirst: string,
      dash: string | undefined,
      rawSecond: string | undefined,
      rawUnit: string,
    ) => {
      const sourceCurrency = normalizeCurrencyAlias(rawUnit);
      if (sourceCurrency === target && rawUnit.toUpperCase() !== "FCFA") {
        return fullMatch;
      }

      const firstVal = parseMatchedNumeric(rawFirst);
      if (firstVal === null) return fullMatch;
      const convertedFirst = convertCurrencyAmount({
        amount: firstVal,
        fromCurrency: sourceCurrency,
        toCurrency: target,
        rates: params.rates,
      });

      const formattedFirst = new Intl.NumberFormat(params.locale === "en" ? "en-US" : "fr-FR", {
        maximumFractionDigits: Number.isInteger(convertedFirst) ? 0 : 2,
      }).format(convertedFirst);

      if (rawSecond && dash) {
        const secondVal = parseMatchedNumeric(rawSecond);
        if (secondVal !== null) {
          const convertedSecond = convertCurrencyAmount({
            amount: secondVal,
            fromCurrency: sourceCurrency,
            toCurrency: target,
            rates: params.rates,
          });
          const formattedSecond = new Intl.NumberFormat(
            params.locale === "en" ? "en-US" : "fr-FR",
            { maximumFractionDigits: Number.isInteger(convertedSecond) ? 0 : 2 },
          ).format(convertedSecond);
          return `${formattedFirst}${dash}${formattedSecond} ${target}`;
        }
      }

      return `${formattedFirst} ${target}`;
    },
  );
}
