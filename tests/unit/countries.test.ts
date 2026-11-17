import { describe, expect, it } from "vitest";
import { convertCurrencyAmount } from "@/lib/currency/converter";
import {
  compareByBettingPriority,
  getBettingPriorityTier,
  TOP_BETTING_TIER1_CODES,
  TOP_BETTING_TIER2_CODES,
} from "@/lib/i18n/betting-priority";
import { COUNTRY_OPTIONS, normalizeCountryCode } from "@/lib/i18n/countries";
import { buildIsoCountriesSeed, ISO_3166_ALPHA2_CODES } from "@/lib/i18n/iso-countries";

describe("Phase 1 — Country directory across continents", () => {
  it("couvre tous les continents habités plus l'option internationale et les 249 pays ISO 3166-1", () => {
    const continents = new Set(COUNTRY_OPTIONS.map((c) => c.continent));
    expect(continents).toEqual(
      new Set(["global", "africa", "europe", "americas", "asia", "oceania"]),
    );
    expect(ISO_3166_ALPHA2_CODES).toHaveLength(249);
    const seed = buildIsoCountriesSeed();
    expect(seed.every((c) => c.active)).toBe(true);
  });

  it("normalise tout code ISO 3166 valide et replie proprement vers GLOBAL sur code inconnu", () => {
    expect(normalizeCountryCode("bj")).toBe("BJ");
    expect(normalizeCountryCode(" fr ")).toBe("FR");
    expect(normalizeCountryCode("ke")).toBe("KE");
    expect(normalizeCountryCode("gh")).toBe("GH");
    expect(normalizeCountryCode("XX")).toBe("GLOBAL");
    expect(normalizeCountryCode(undefined)).toBe("GLOBAL");
  });

  it("priorise les principaux marchés mondiaux de paris sportifs et gaming et convertit leurs devises", () => {
    expect(getBettingPriorityTier("NG")).toBe(1);
    expect(getBettingPriorityTier("ZA")).toBe(1);
    expect(getBettingPriorityTier("KE")).toBe(1);
    expect(getBettingPriorityTier("GB")).toBe(1);
    expect(getBettingPriorityTier("BR")).toBe(1);
    expect(getBettingPriorityTier("TG")).toBe(2);
    expect(getBettingPriorityTier("AD")).toBe(3);

    const sorted = [{ code: "AD" }, { code: "TG" }, { code: "NG" }].sort(compareByBettingPriority);
    expect(sorted.map((c) => c.code)).toEqual(["NG", "TG", "AD"]);
    expect(TOP_BETTING_TIER1_CODES.length + TOP_BETTING_TIER2_CODES.length).toBeGreaterThanOrEqual(
      90,
    );

    const kesAmount = convertCurrencyAmount({
      amount: 130000,
      fromCurrency: "XOF",
      toCurrency: "KES",
    });
    expect(kesAmount).toBeGreaterThan(20000);
    const ghsAmount = convertCurrencyAmount({
      amount: 130000,
      fromCurrency: "XOF",
      toCurrency: "GHS",
    });
    expect(ghsAmount).toBeGreaterThan(2000);
  });
});
