import {
  convertCurrencyAmount,
  formatCurrencyAmount,
  localizeFinancialText,
  normalizeCurrencyAlias,
} from "@/lib/currency/converter";
import { formatAmountDisplay } from "@/modules/offers/public-mappers";

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
    rolloverText: params.rolloverText ? loc(params.rolloverText) : undefined,
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
