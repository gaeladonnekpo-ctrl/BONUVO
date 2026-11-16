import { describe, expect, it } from "vitest";
import { COUNTRY_OPTIONS, normalizeCountryCode } from "@/lib/i18n/countries";

describe("Phase 1 — Country directory across continents", () => {
  it("couvre tous les continents habités plus l'option internationale", () => {
    const continents = new Set(COUNTRY_OPTIONS.map((c) => c.continent));
    expect(continents).toEqual(
      new Set(["global", "africa", "europe", "americas", "asia", "oceania"]),
    );
  });

  it("normalise ou replie proprement vers GLOBAL sur code inconnu", () => {
    expect(normalizeCountryCode("bj")).toBe("BJ");
    expect(normalizeCountryCode(" fr ")).toBe("FR");
    expect(normalizeCountryCode("XX")).toBe("GLOBAL");
    expect(normalizeCountryCode(undefined)).toBe("GLOBAL");
  });
});
