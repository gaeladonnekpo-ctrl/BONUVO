import "server-only";

import { and, asc, desc, eq, ilike, isNull, or } from "drizzle-orm";
import { withAppDb } from "@/server/db/context";
import {
  bookmakers,
  countries,
  offerCountries,
  offerHighlights,
  offerTerms,
  offers,
  promoCodes,
} from "@/server/db/schema";

export interface OfferListFilter {
  search?: string;
  status?: string;
  bookmakerId?: string;
}

export async function listOffersRepo(actorId: string, filter: OfferListFilter = {}) {
  return withAppDb({ scope: "user_session", actorId }, async (tx) => {
    const conditions = [isNull(offers.deletedAt)];
    if (filter.status && filter.status !== "all") {
      conditions.push(
        eq(
          offers.status,
          filter.status as "draft" | "published" | "expired" | "disabled" | "archived",
        ),
      );
    }
    if (filter.bookmakerId) {
      conditions.push(eq(offers.bookmakerId, filter.bookmakerId));
    }
    if (filter.search?.trim()) {
      const q = `%${filter.search.trim()}%`;
      conditions.push(
        or(ilike(offers.titleFr, q), ilike(offers.titleEn, q), ilike(offers.slug, q))!,
      );
    }

    return tx
      .select({
        id: offers.id,
        slug: offers.slug,
        titleFr: offers.titleFr,
        titleEn: offers.titleEn,
        offerType: offers.offerType,
        bonusAmount: offers.bonusAmount,
        currencyCode: offers.currencyCode,
        bonusPercentage: offers.bonusPercentage,
        status: offers.status,
        lastVerifiedAt: offers.lastVerifiedAt,
        validUntil: offers.validUntil,
        rankOrder: offers.rankOrder,
        bookmakerId: offers.bookmakerId,
        bookmakerName: bookmakers.name,
        updatedAt: offers.updatedAt,
      })
      .from(offers)
      .innerJoin(bookmakers, eq(offers.bookmakerId, bookmakers.id))
      .where(and(...conditions))
      .orderBy(asc(offers.rankOrder), desc(offers.updatedAt));
  });
}

export async function getOfferByIdRepo(actorId: string, offerId: string) {
  return withAppDb({ scope: "user_session", actorId }, async (tx) => {
    const [offer] = await tx
      .select({
        id: offers.id,
        bookmakerId: offers.bookmakerId,
        bookmakerName: bookmakers.name,
        offerType: offers.offerType,
        slug: offers.slug,
        titleFr: offers.titleFr,
        titleEn: offers.titleEn,
        bonusAmount: offers.bonusAmount,
        currencyCode: offers.currencyCode,
        bonusPercentage: offers.bonusPercentage,
        minDeposit: offers.minDeposit,
        rolloverText: offers.rolloverText,
        minOdds: offers.minOdds,
        validFrom: offers.validFrom,
        validUntil: offers.validUntil,
        lastVerifiedAt: offers.lastVerifiedAt,
        verifiedBy: offers.verifiedBy,
        badgeCode: offers.badgeCode,
        rankOrder: offers.rankOrder,
        status: offers.status,
        deletedAt: offers.deletedAt,
        createdAt: offers.createdAt,
        updatedAt: offers.updatedAt,
      })
      .from(offers)
      .innerJoin(bookmakers, eq(offers.bookmakerId, bookmakers.id))
      .where(eq(offers.id, offerId));

    if (!offer) return null;

    const countryRows = await tx
      .select({
        countryId: offerCountries.countryId,
        code: countries.code,
        nameFr: countries.nameFr,
        rankOverride: offerCountries.rankOverride,
      })
      .from(offerCountries)
      .innerJoin(countries, eq(offerCountries.countryId, countries.id))
      .where(eq(offerCountries.offerId, offerId))
      .orderBy(asc(countries.nameFr));

    const terms = await tx
      .select()
      .from(offerTerms)
      .where(and(eq(offerTerms.offerId, offerId), isNull(offerTerms.deletedAt)))
      .orderBy(asc(offerTerms.sortOrder), asc(offerTerms.createdAt));

    const highlights = await tx
      .select()
      .from(offerHighlights)
      .where(and(eq(offerHighlights.offerId, offerId), isNull(offerHighlights.deletedAt)))
      .orderBy(asc(offerHighlights.sortOrder), asc(offerHighlights.createdAt));

    const codes = await tx
      .select()
      .from(promoCodes)
      .where(and(eq(promoCodes.offerId, offerId), isNull(promoCodes.deletedAt)))
      .orderBy(desc(promoCodes.createdAt));

    return { offer, countries: countryRows, terms, highlights, promoCodes: codes };
  });
}

export async function listPromoCodesRepo(actorId: string) {
  return withAppDb({ scope: "user_session", actorId }, async (tx) =>
    tx
      .select({
        id: promoCodes.id,
        code: promoCodes.code,
        description: promoCodes.description,
        bookmakerId: promoCodes.bookmakerId,
        bookmakerName: bookmakers.name,
        offerId: promoCodes.offerId,
        offerTitleFr: offers.titleFr,
        countryId: promoCodes.countryId,
        countryCode: countries.code,
        validFrom: promoCodes.validFrom,
        validUntil: promoCodes.validUntil,
        status: promoCodes.status,
      })
      .from(promoCodes)
      .innerJoin(bookmakers, eq(promoCodes.bookmakerId, bookmakers.id))
      .leftJoin(offers, eq(promoCodes.offerId, offers.id))
      .leftJoin(countries, eq(promoCodes.countryId, countries.id))
      .where(isNull(promoCodes.deletedAt))
      .orderBy(desc(promoCodes.updatedAt)),
  );
}
