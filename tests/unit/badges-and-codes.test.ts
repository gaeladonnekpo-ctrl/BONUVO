import { describe, expect, it } from "vitest";
import { resolveOfferBadges } from "@/modules/offers/public-mappers";
import { offerInputSchema, promoCodeSchema } from "@/modules/offers/schema";

describe("Point 7 - Badges justification & promo code program source", () => {
  it("strips exclusive badge when promo code is shared or justification is empty", () => {
    const now = new Date("2026-11-19T12:00:00Z");
    expect(
      resolveOfferBadges({
        badgeCode: "exclusive",
        badgeJustification: "Code négocié en direct",
        isSharedPromoCode: true,
        createdAt: now,
        lastVerifiedAt: now,
        now,
      }),
    ).toEqual(["verified"]);

    expect(
      resolveOfferBadges({
        badgeCode: "recommended",
        badgeJustification: "",
        isSharedPromoCode: false,
        createdAt: now,
        lastVerifiedAt: null,
        now,
      }),
    ).toEqual([]);

    expect(
      resolveOfferBadges({
        badgeCode: "recommended",
        badgeJustification: "Sélection éditoriale BONUVO",
        isSharedPromoCode: false,
        createdAt: now,
        lastVerifiedAt: null,
        now,
      }),
    ).toEqual(["recommended"]);
  });

  it("requires badgeJustification in offerInputSchema when badgeCode is set", () => {
    const base = {
      bookmakerId: "11111111-1111-4111-8111-111111111111",
      slug: "offre-test",
      titleFr: "Bonus test FR",
      titleEn: "Bonus test EN",
      countryIds: ["22222222-2222-4222-8222-222222222222"],
      badgeCode: "recommended",
    };

    expect(offerInputSchema.safeParse({ ...base, badgeJustification: "" }).success).toBe(false);
    expect(
      offerInputSchema.safeParse({
        ...base,
        badgeJustification: "Meilleure couverture Afrique de l'Ouest",
      }).success,
    ).toBe(true);
  });

  it("accepts programSource on promoCodeSchema", () => {
    const parsed = promoCodeSchema.safeParse({
      bookmakerId: "11111111-1111-4111-8111-111111111111",
      code: "GAEL229",
      programSource: "1xPartners",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.programSource).toBe("1xPartners");
    }
  });
});
