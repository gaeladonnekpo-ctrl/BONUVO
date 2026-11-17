import "server-only";

import { and, asc, desc, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";
import { withAppDb } from "@/server/db/context";
import {
  bookmakerCountries,
  bookmakerPaymentMethods,
  bookmakerRatings,
  bookmakers,
  countries,
  mediaAssets,
  offers,
  paymentMethods,
  promoCodes,
} from "@/server/db/schema";
import { loadCatalogMetaTx } from "@/modules/offers/public-catalog-meta-repo";
import { buildShortCode, getPaymentSortPriority } from "@/modules/offers/public-mappers";
import type { PublicBookmakerListItem, PublicCatalogMeta } from "@/modules/offers/public-types";

export async function listPublicBookmakersRepo(params: {
  countryCode: string;
}): Promise<{ bookmakers: PublicBookmakerListItem[]; meta: PublicCatalogMeta }> {
  return withAppDb({ scope: "public_catalog" }, async (tx) => {
    const meta = await loadCatalogMetaTx(tx, params.countryCode);
    const upperCountry = params.countryCode.toUpperCase();
    const now = new Date();

    let targetCountryId: string | null = null;
    if (upperCountry !== "GLOBAL") {
      const [countryRow] = await tx
        .select({ id: countries.id })
        .from(countries)
        .where(and(eq(countries.code, upperCountry), eq(countries.active, true)));
      if (!countryRow) return { bookmakers: [], meta };
      targetCountryId = countryRow.id;
    }

    const rawBms = await tx
      .select({ bookmaker: bookmakers, logoUrl: mediaAssets.publicUrl })
      .from(bookmakers)
      .leftJoin(mediaAssets, eq(mediaAssets.id, bookmakers.logoAssetId))
      .where(and(eq(bookmakers.status, "active"), isNull(bookmakers.deletedAt)))
      .orderBy(asc(bookmakers.name));

    if (rawBms.length === 0) return { bookmakers: [], meta };
    const bmIds = rawBms.map((r) => r.bookmaker.id);

    const [bmCountries, bmRatings, bmPayments, activeOffers, activePromos] = await Promise.all([
      tx
        .select()
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
        .select()
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
          and(inArray(bookmakerPaymentMethods.bookmakerId, bmIds), eq(paymentMethods.active, true)),
        ),
      tx
        .select({
          id: offers.id,
          bookmakerId: offers.bookmakerId,
          slug: offers.slug,
          offerType: offers.offerType,
        })
        .from(offers)
        .where(
          and(
            inArray(offers.bookmakerId, bmIds),
            eq(offers.status, "published"),
            isNull(offers.deletedAt),
            or(isNull(offers.validFrom), lte(offers.validFrom, now)),
            or(isNull(offers.validUntil), gt(offers.validUntil, now)),
          ),
        )
        .orderBy(asc(offers.rankOrder)),
      tx
        .select({ id: promoCodes.id, bookmakerId: promoCodes.bookmakerId })
        .from(promoCodes)
        .where(
          and(
            inArray(promoCodes.bookmakerId, bmIds),
            eq(promoCodes.status, "active"),
            isNull(promoCodes.deletedAt),
          ),
        ),
    ]);

    const items: PublicBookmakerListItem[] = [];
    for (const { bookmaker, logoUrl } of rawBms) {
      if (
        targetCountryId &&
        !bmCountries.some(
          (bc) => bc.bookmakerId === bookmaker.id && bc.countryId === targetCountryId,
        )
      ) {
        continue;
      }

      const rating = bmRatings.find((r) => r.bookmakerId === bookmaker.id);
      const countryEntry = targetCountryId
        ? bmCountries.find(
            (bc) => bc.bookmakerId === bookmaker.id && bc.countryId === targetCountryId,
          )
        : bmCountries.find((bc) => bc.bookmakerId === bookmaker.id && bc.localLicense);

      const paymentsMap = new Map<
        string,
        { slug: string; name: string; category: string; logoUrl: string | null }
      >();
      for (const p of bmPayments) {
        if (p.bookmakerId !== bookmaker.id) continue;
        if (targetCountryId && p.countryId !== targetCountryId) continue;
        if (!paymentsMap.has(p.slug)) {
          paymentsMap.set(p.slug, {
            slug: p.slug,
            name: p.name,
            category: p.category,
            logoUrl: p.logoUrl ?? null,
          });
        }
      }

      const bmOffers = activeOffers.filter((o) => o.bookmakerId === bookmaker.id);
      const primaryOffer = bmOffers.find((o) => o.offerType === "welcome") ?? bmOffers[0];

      items.push({
        id: bookmaker.id,
        name: bookmaker.name,
        slug: bookmaker.slug,
        shortCode: buildShortCode(bookmaker.name),
        logoUrl: logoUrl ?? null,
        foundedYear: bookmaker.foundedYear,
        appPlatforms: bookmaker.appPlatforms,
        finalScore: rating ? Number(rating.finalScore) : null,
        activeOffersCount: bmOffers.length,
        activePromoCount: activePromos.filter((p) => p.bookmakerId === bookmaker.id).length,
        primaryOfferSlug: primaryOffer?.slug ?? null,
        licenseSummary: countryEntry?.localLicense || countryEntry?.authorityName || null,
        paymentMethods: Array.from(paymentsMap.values()).sort(
          (a, b) =>
            getPaymentSortPriority(a) - getPaymentSortPriority(b) || a.name.localeCompare(b.name),
        ),
      });
    }

    items.sort((a, b) => (b.finalScore ?? -1) - (a.finalScore ?? -1));
    return { bookmakers: items, meta };
  });
}
