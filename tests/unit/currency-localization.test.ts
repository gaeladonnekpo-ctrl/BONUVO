import { describe, expect, it } from "vitest";
import {
  convertCurrencyAmount,
  formatCurrencyAmount,
  localizeFinancialText,
  roundCurrencyForDisplay,
} from "@/lib/currency/converter";
import {
  localizeOfferFields,
  localizePaymentMinDeposit,
} from "@/modules/offers/public-currency-localize";

describe("Système de conversion et localisation des devises par pays", () => {
  it("préserve à l'identique la devise source (XOF -> XOF) et la parité FCFA (XOF <-> XAF)", () => {
    expect(convertCurrencyAmount({ amount: 130000, fromCurrency: "XOF", toCurrency: "XOF" })).toBe(
      130000,
    );
    expect(convertCurrencyAmount({ amount: 500, fromCurrency: "XOF", toCurrency: "XAF" })).toBe(
      500,
    );
    expect(
      localizeFinancialText({
        text: "Bonus jusqu'à 130 000 XOF dès 500 XOF",
        targetCurrency: "XOF",
        locale: "fr",
      }),
    ).toBe("Bonus jusqu'à 130 000 XOF dès 500 XOF");
  });

  it("convertit correctement XOF vers NGN (Nigeria), EUR et CDF avec arrondi propre", () => {
    const ngnBonus = convertCurrencyAmount({
      amount: 130000,
      fromCurrency: "XOF",
      toCurrency: "NGN",
    });
    expect(ngnBonus).toBeGreaterThan(250000);
    expect(ngnBonus).toBeLessThan(350000);
    expect(ngnBonus % 1000).toBe(0);

    const eurBonus = convertCurrencyAmount({
      amount: 130000,
      fromCurrency: "XOF",
      toCurrency: "EUR",
    });
    expect(eurBonus).toBe(200);

    const eurMin = convertCurrencyAmount({ amount: 500, fromCurrency: "XOF", toCurrency: "EUR" });
    expect(eurMin).toBe(1);

    expect(roundCurrencyForDisplay(334892, "NGN")).toBe(335000);
    expect(formatCurrencyAmount(200, "EUR", "fr")).toBe("200 EUR");
  });

  it("convertit tous les montants et intervalles dans les intitulés, conditions et dépôts de paiement sans mélange de devises", () => {
    const localized = localizeOfferFields({
      sourceCurrency: "XOF",
      targetCurrency: "NGN",
      locale: "en",
      bonusAmount: "130000.00",
      bonusPercentage: 200,
      minDeposit: "600.00",
      headline: "500% Welcome Pack up to 562,500 XOF · 200% up to 130,000 XOF",
      positiveHighlights: ["Mobile Money deposits from 600 XOF", "Activation from 13,120 XOF"],
      negativeHighlight: "Higher minimum deposit (3,300 XOF) compared to 500–600 XOF peers.",
      rolloverText:
        "5x en paris combinés (min. 3 sélections, cote min. 1.40, 30 jours) dès 500 XOF",
      termsSummary: "Applies from 600 XOF up to 130,000 XOF.",
    });

    expect(localized.currencyCode).toBe("NGN");
    expect(localized.bonusAmountDisplay).toContain("NGN");
    expect(localized.bonusAmountDisplay).not.toContain("XOF");
    expect(localized.bonusHeadline).toContain("NGN");
    expect(localized.bonusHeadline).not.toContain("XOF");
    expect(localized.bonusHeadline).not.toContain("562,");
    expect(localized.bonusHeadline).not.toContain("130,0");
    expect(localized.highlights[0]).toContain("NGN");
    expect(localized.highlights[1]).not.toContain("13,");
    expect(localized.highlights[0]).not.toContain("XOF");
    expect(localized.weaknessNote).not.toContain("XOF");
    expect(localized.weaknessNote).toMatch(/\d[\d,]+–\d[\d,]+\s+NGN/);
    expect(localized.rolloverText).not.toContain("XOF");
    expect(localized.rolloverText).toContain("in accumulator bets");
    expect(localized.rolloverText).toContain("selections");
    expect(localized.rolloverText).toContain("min. odds");
    expect(localized.rolloverText).toContain("days");
    expect(localized.termsSummary).not.toContain("XOF");

    const minDepNgn = localizePaymentMinDeposit({
      rawAmount: "500.00",
      sourceCurrency: "XOF",
      targetCurrency: "NGN",
      locale: "en",
    });
    expect(minDepNgn).toMatch(/^\d[\d,]* NGN$/);
  });
});
