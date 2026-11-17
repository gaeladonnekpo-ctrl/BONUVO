import {
  convertCurrencyAmount,
  formatCurrencyAmount,
  localizeFinancialText,
  normalizeCurrencyAlias,
} from "@/lib/currency/converter";
import { formatAmountDisplay } from "@/modules/offers/public-mappers";

const ROLLOVER_EN_REPLACEMENTS: ReadonlyArray<readonly [RegExp, string]> = [
  [
    /R[ée]parti sur (\d+) d[ée]p[ôo]ts?\s*·\s*d[ée]blocage progressif sur paris [àa] cotes qualifiantes/gi,
    "Split across $1 deposits · gradual release on qualifying odds bets",
  ],
  [/en paris combin[ée]s/gi, "in accumulator bets"],
  [/en paris simples ou combin[ée]s/gi, "in single or accumulator bets"],
  [/en paris sportifs/gi, "in sports bets"],
  [/s[ée]lections?/gi, "selections"],
  [/cote min\./gi, "min. odds"],
  [/jours/gi, "days"],
  [/\bjour\b/gi, "day"],
  [/sur le bonus/gi, "on bonus"],
  [/d[ée]p[ôo]t\s*\+\s*bonus/gi, "deposit + bonus"],
  [/valable/gi, "valid"],
  [/aucun rollover/gi, "no rollover"],
];

function translateRolloverText(text: string, locale: "fr" | "en"): string {
  if (locale !== "en") return text;
  let translated = text;
  for (const [pattern, replacement] of ROLLOVER_EN_REPLACEMENTS) {
    translated = translated.replace(pattern, replacement);
  }
  return translated;
}

export function localizeOfferFields(params: {
  sourceCurrency: string;
  targetCurrency: string;
  locale: "fr" | "en";
  bonusAmount: string | number | null;
  bonusPercentage: number | null;
  minDeposit: string | number | null;
  headline: string;
  positiveHighlights: readonly string[];
  negativeHighlight?: string;
  rolloverText?: string | null;
  termsSummary?: string;
}) {
  const from = normalizeCurrencyAlias(params.sourceCurrency);
  const to = normalizeCurrencyAlias(params.targetCurrency);

  const rawBonus = params.bonusAmount !== null ? Number(params.bonusAmount) : null;
  const convertedBonus =
    rawBonus !== null && Number.isFinite(rawBonus)
      ? convertCurrencyAmount({ amount: rawBonus, fromCurrency: from, toCurrency: to })
      : null;

  const rawMinDeposit = params.minDeposit !== null ? Number(params.minDeposit) : null;
  const convertedMinDeposit =
    rawMinDeposit !== null && Number.isFinite(rawMinDeposit)
      ? convertCurrencyAmount({ amount: rawMinDeposit, fromCurrency: from, toCurrency: to })
      : null;

  const loc = (text: string) =>
    localizeFinancialText({ text, targetCurrency: to, locale: params.locale });

  return {
    currencyCode: to,
    bonusAmountNumber: convertedBonus,
    minDepositNumber: convertedMinDeposit,
    bonusAmountDisplay: formatAmountDisplay({
      bonusAmount: convertedBonus,
      bonusPercentage: params.bonusPercentage,
      currencyCode: to,
      locale: params.locale,
    }),
    bonusHeadline: loc(params.headline),
    highlights: params.positiveHighlights.map(loc),
    weaknessNote: params.negativeHighlight ? loc(params.negativeHighlight) : undefined,
    rolloverText: params.rolloverText
      ? loc(translateRolloverText(params.rolloverText, params.locale))
      : undefined,
    termsSummary: params.termsSummary ? loc(params.termsSummary) : undefined,
  };
}

export function localizePaymentMinDeposit(params: {
  rawAmount: string | number | null;
  sourceCurrency: string;
  targetCurrency: string;
  locale: "fr" | "en";
}): string | null {
  if (params.rawAmount === null || params.rawAmount === undefined) return null;
  const numeric = Number(params.rawAmount);
  if (!Number.isFinite(numeric)) return null;
  const converted = convertCurrencyAmount({
    amount: numeric,
    fromCurrency: params.sourceCurrency,
    toCurrency: params.targetCurrency,
  });
  return formatCurrencyAmount(converted, params.targetCurrency, params.locale);
}
