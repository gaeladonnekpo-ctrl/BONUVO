import "server-only";

import { and, asc, desc, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";
import { getCatalogCacheGeneration } from "@/server/cache/catalog-tags";
import type { AppDbTransaction } from "@/server/db/context";
import {
  affiliateLinks,
  bookmakerCountries,
  bookmakerPaymentMethods,
  bookmakerRatings,
  bookmakers,
  countries,
  mediaAssets,
  offerCountries,
  offerHighlights,
  offerTerms,
  offers,
  paymentMethods,
  promoCodes,
} from "@/server/db/schema";

async function fetchRawOffersSnapshotTx(tx: AppDbTransaction) {
  const now = new Date();
  const rawOffers = await tx
    .select({ offer: offers, bookmaker: bookmakers, logoUrl: mediaAssets.publicUrl })
    .from(offers)
    .innerJoin(bookmakers, eq(bookmakers.id, offers.bookmakerId))
    .leftJoin(mediaAssets, eq(mediaAssets.id, bookmakers.logoAssetId))
    .where(
      and(
        eq(offers.status, "published"),
        isNull(offers.deletedAt),
        eq(bookmakers.status, "active"),
        isNull(bookmakers.deletedAt),
        or(isNull(offers.validFrom), lte(offers.validFrom, now)),
        or(isNull(offers.validUntil), gt(offers.validUntil, now)),
      ),
    );

  if (rawOffers.length === 0) return null;

  const offerIds = rawOffers.map((r) => r.offer.id);
  const bmIds = Array.from(new Set(rawOffers.map((r) => r.bookmaker.id)));

  const [
    offerCountryRows,
    bmCountryRows,
    ratingRows,
    bmPaymentRows,
    promoRows,
    linkRows,
    highlightRows,
    termRows,
  ] = await Promise.all([
    tx
      .select({
        offerId: offerCountries.offerId,
        countryId: offerCountries.countryId,
        rankOverride: offerCountries.rankOverride,
        code: countries.code,
      })
      .from(offerCountries)
      .innerJoin(countries, eq(countries.id, offerCountries.countryId))
      .where(and(inArray(offerCountries.offerId, offerIds), eq(countries.active, true))),
    tx
      .select({
        bookmakerId: bookmakerCountries.bookmakerId,
        countryId: bookmakerCountries.countryId,
        localLicense: bookmakerCountries.localLicense,
        authorityName: bookmakerCountries.authorityName,
      })
      .from(bookmakerCountries)
      .where(
        and(
          inArray(bookmakerCountries.bookmakerId, bmIds),
          eq(bookmakerCountries.eligible, true),
          eq(bookmakerCountries.status, "active"),
          isNull(bookmakerCountries.deletedAt),
        ),
      ),
    tx
      .select({
        bookmakerId: bookmakerRatings.bookmakerId,
        finalScore: bookmakerRatings.finalScore,
        createdAt: bookmakerRatings.createdAt,
      })
      .from(bookmakerRatings)
      .where(inArray(bookmakerRatings.bookmakerId, bmIds))
      .orderBy(desc(bookmakerRatings.createdAt)),
    tx
      .select({
        bookmakerId: bookmakerPaymentMethods.bookmakerId,
        countryId: bookmakerPaymentMethods.countryId,
        slug: paymentMethods.slug,
        name: paymentMethods.name,
        category: paymentMethods.category,
        logoUrl: mediaAssets.publicUrl,
      })
      .from(bookmakerPaymentMethods)
      .innerJoin(paymentMethods, eq(paymentMethods.id, bookmakerPaymentMethods.paymentMethodId))
      .leftJoin(mediaAssets, eq(mediaAssets.id, paymentMethods.logoAssetId))
      .where(
        and(
          inArray(bookmakerPaymentMethods.bookmakerId, bmIds),
          eq(bookmakerPaymentMethods.confirmed, true),
          eq(paymentMethods.active, true),
        ),
      ),
    tx
      .select()
      .from(promoCodes)
      .where(
        and(
          inArray(promoCodes.bookmakerId, bmIds),
          eq(promoCodes.status, "active"),
          isNull(promoCodes.deletedAt),
          or(isNull(promoCodes.validFrom), lte(promoCodes.validFrom, now)),
          or(isNull(promoCodes.validUntil), gt(promoCodes.validUntil, now)),
        ),
      ),
    tx
      .select({
        slug: affiliateLinks.slug,
        bookmakerId: affiliateLinks.bookmakerId,
        offerId: affiliateLinks.offerId,
        countryId: affiliateLinks.countryId,
      })
      .from(affiliateLinks)
      .where(
        and(
          inArray(affiliateLinks.bookmakerId, bmIds),
          eq(affiliateLinks.active, true),
          eq(affiliateLinks.status, "active"),
          isNull(affiliateLinks.deletedAt),
        ),
      ),
    tx
      .select()
      .from(offerHighlights)
      .where(
        and(
          inArray(offerHighlights.offerId, offerIds),
          eq(offerHighlights.status, "active"),
          isNull(offerHighlights.deletedAt),
        ),
      )
      .orderBy(asc(offerHighlights.sortOrder)),
    tx
      .select()
      .from(offerTerms)
      .where(
        and(
          inArray(offerTerms.offerId, offerIds),
          eq(offerTerms.status, "active"),
          isNull(offerTerms.deletedAt),
        ),
      )
      .orderBy(asc(offerTerms.sortOrder)),
  ]);

  return {
    rawOffers,
    offerCountryRows,
    bmCountryRows,
    ratingRows,
    bmPaymentRows,
    promoRows,
    linkRows,
    highlightRows,
    termRows,
  };
}

export type RawOffersSnapshot = Awaited<ReturnType<typeof fetchRawOffersSnapshotTx>>;

let offersMemoryCache: {
  data: RawOffersSnapshot;
  expiresAt: number;
  generation: number;
} | null = null;

export function isOffersSnapshotWarm(): boolean {
  const isTest = process.env.VITEST === "true" || process.env.NODE_ENV === "test";
  return Boolean(
    !isTest &&
    offersMemoryCache &&
    offersMemoryCache.generation === getCatalogCacheGeneration() &&
    offersMemoryCache.expiresAt > Date.now(),
  );
}

export async function getRawOffersSnapshotOnTx(tx: AppDbTransaction): Promise<RawOffersSnapshot> {
  if (isOffersSnapshotWarm()) {
    return offersMemoryCache!.data;
  }
  const isTest = process.env.VITEST === "true" || process.env.NODE_ENV === "test";
  const gen = getCatalogCacheGeneration();
  const data = await fetchRawOffersSnapshotTx(tx);
  if (!isTest) {
    offersMemoryCache = { data, expiresAt: Date.now() + 300_000, generation: gen };
  }
  return data;
}
