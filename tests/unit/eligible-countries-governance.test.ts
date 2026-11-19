import { describe, expect, it } from "vitest";
import {
  compareByBettingPriority,
  TOP_BETTING_TIER1_CODES,
  TOP_BETTING_TIER2_CODES,
} from "@/lib/i18n/betting-priority";
import { bookmakerCountrySchema } from "@/modules/offers/schema";

describe("Point 3 - Eligible countries priority & legal validation governance", () => {
  it("prioritizes West African countries at the top before other regions", () => {
    const sample = [
      { code: "FR", nameFr: "France" },
      { code: "ZA", nameFr: "Afrique du Sud" },
      { code: "CM", nameFr: "Cameroun" },
      { code: "SN", nameFr: "Sénégal" },
      { code: "CI", nameFr: "Côte d’Ivoire" },
      { code: "BJ", nameFr: "Bénin" },
      { code: "TG", nameFr: "Togo" },
    ];
    const sorted = [...sample].sort(compareByBettingPriority).map((c) => c.code);
    expect(sorted.slice(0, 4)).toEqual(["BJ", "CI", "SN", "TG"]);
  });

  it("excludes strictly prohibited jurisdictions (MR, SA, SG, ID, DZ, EG) from priority lists", () => {
    const allPriority = new Set<string>([...TOP_BETTING_TIER1_CODES, ...TOP_BETTING_TIER2_CODES]);
    for (const code of ["MR", "SA", "SG", "ID", "DZ", "EG", "BD", "PK", "TH", "VN"]) {
      expect(allPriority.has(code)).toBe(false);
    }
  });

  it("requires legalValidatedBy and legalSource when opening an eligible country", () => {
    const base = {
      bookmakerId: "11111111-1111-4111-8111-111111111111",
      countryId: "22222222-2222-4222-8222-222222222222",
      eligible: true,
    };

    expect(bookmakerCountrySchema.safeParse(base).success).toBe(false);
    expect(
      bookmakerCountrySchema.safeParse({
        ...base,
        legalValidatedBy: "Équipe conformité",
        legalSource: "Décision LNB 2026",
      }).success,
    ).toBe(true);
    expect(bookmakerCountrySchema.safeParse({ ...base, eligible: false }).success).toBe(true);
  });
});
