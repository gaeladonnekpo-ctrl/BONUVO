import "server-only";

import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { withAppDb } from "@/server/db/context";
import {
  affiliateLinks,
  bookmakerCountries,
  bookmakerPaymentMethods,
  bookmakerRatings,
  bookmakers,
  countries,
  mediaAssets,
  paymentMethods,
  promoCodes,
} from "@/server/db/schema";
import { selectBestAffiliateSlug } from "@/modules/offers/public-catalog-meta-repo";
import { buildShortCode } from "@/modules/offers/public-mappers";
import { queryPublishedOffersTx } from "@/modules/offers/public-offers-repo";
import type { PublicBookmakerDetailData } from "@/modules/offers/public-types";

export async function getPublicBookmakerBySlugRepo(params: {
  slug: string;
  countryCode: string;
  locale: "fr" | "en";
}): Promise<PublicBookmakerDetailData | null> {
  return withAppDb({ scope: "public_catalog" }, async (tx) => {
    const [row] = await tx
      .select({ bookmaker: bookmakers, logoUrl: mediaAssets.publicUrl })
      .from(bookmakers)
      .leftJoin(mediaAssets, eq(mediaAssets.id, bookmakers.logoAssetId))
      .where(
        and(
          eq(bookmakers.slug, params.slug),
          eq(bookmakers.status, "active"),
          isNull(bookmakers.deletedAt),
        ),
      );
    if (!row) return null;

    const upperCountry = params.countryCode.toUpperCase();
    const [bmCountries, bmRatings, bmPayments, promos, links] = await Promise.all([
      tx
        .select({
          countryId: bookmakerCountries.countryId,
          countryCode: countries.code,
          countryNameFr: countries.nameFr,
          countryNameEn: countries.nameEn,
          localLicense: bookmakerCountries.localLicense,
          authorityName: bookmakerCountries.authorityName,
          countryScore: bookmakerCountries.countryScore,
        })
        .from(bookmakerCountries)
        .innerJoin(countries, eq(countries.id, bookmakerCountries.countryId))
        .where(
          and(
            eq(bookmakerCountries.bookmakerId, row.bookmaker.id),
            eq(bookmakerCountries.eligible, true),
            eq(bookmakerCountries.status, "active"),
            isNull(bookmakerCountries.deletedAt),
            eq(countries.active, true),
          ),
        )
        .orderBy(asc(countries.code)),
      tx
        .select()
        .from(bookmakerRatings)
        .where(eq(bookmakerRatings.bookmakerId, row.bookmaker.id))
        .orderBy(desc(bookmakerRatings.createdAt))
        .limit(1),
      tx
        .select({
          countryCode: countries.code,
          slug: paymentMethods.slug,
          name: paymentMethods.name,
          category: paymentMethods.category,
          logoUrl: mediaAssets.publicUrl,
          minDepositAmount: bookmakerPaymentMethods.minDepositAmount,
          currencyCode: bookmakerPaymentMethods.currencyCode,
          supportsDeposit: bookmakerPaymentMethods.supportsDeposit,
          supportsWithdrawal: bookmakerPaymentMethods.supportsWithdrawal,
        })
        .from(bookmakerPaymentMethods)
        .innerJoin(paymentMethods, eq(paymentMethods.id, bookmakerPaymentMethods.paymentMethodId))
        .leftJoin(mediaAssets, eq(mediaAssets.id, paymentMethods.logoAssetId))
        .innerJoin(countries, eq(countries.id, bookmakerPaymentMethods.countryId))
        .where(
          and(
            eq(bookmakerPaymentMethods.bookmakerId, row.bookmaker.id),
            eq(paymentMethods.active, true),
            eq(countries.active, true),
          ),
        ),
      tx
        .select({ promo: promoCodes, countryCode: countries.code })
        .from(promoCodes)
        .leftJoin(countries, eq(countries.id, promoCodes.countryId))
        .where(
          and(
            eq(promoCodes.bookmakerId, row.bookmaker.id),
            eq(promoCodes.status, "active"),
            isNull(promoCodes.deletedAt),
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
            eq(affiliateLinks.bookmakerId, row.bookmaker.id),
            eq(affiliateLinks.active, true),
            eq(affiliateLinks.status, "active"),
            isNull(affiliateLinks.deletedAt),
          ),
        ),
    ]);

    const eligibleInCountry =
      upperCountry === "GLOBAL" || bmCountries.some((c) => c.countryCode === upperCountry);
    const targetCountryId =
      bmCountries.find((c) => c.countryCode === upperCountry)?.countryId ?? null;

    const { offers: activeOffers } = eligibleInCountry
      ? await queryPublishedOffersTx(tx, {
          countryCode: upperCountry,
          locale: params.locale,
          filter: { bookmaker: row.bookmaker.slug },
        })
      : { offers: [] };

    const latestRating = bmRatings[0];
    const uniquePayments = Array.from(
      new Map(
        bmPayments
          .filter((p) => upperCountry === "GLOBAL" || p.countryCode === upperCountry)
          .map((p) => [
            p.slug,
            {
              slug: p.slug,
              name: p.name,
              category: p.category,
              logoUrl: p.logoUrl ?? null,
              minDepositDisplay: p.minDepositAmount
                ? `${String(p.minDepositAmount).replace(/\.00$/, "")} ${p.currencyCode}`
                : null,
              supportsDeposit: p.supportsDeposit,
              supportsWithdrawal: p.supportsWithdrawal,
            },
          ]),
      ).values(),
    );

    const bestSlug = eligibleInCountry
      ? selectBestAffiliateSlug({
          links,
          bookmakerId: row.bookmaker.id,
          offerId: null,
          countryId: targetCountryId,
        })
      : null;

    const activePromoCodes = eligibleInCountry
      ? promos
          .filter(
            (p) => !p.countryCode || upperCountry === "GLOBAL" || p.countryCode === upperCountry,
          )
          .map((p) => ({
            id: p.promo.id,
            code: p.promo.code,
            description: p.promo.description,
            bookmakerId: row.bookmaker.id,
            bookmakerName: row.bookmaker.name,
            bookmakerSlug: row.bookmaker.slug,
            bookmakerShortCode: buildShortCode(row.bookmaker.name),
            bookmakerLogoUrl: row.logoUrl ?? null,
            offerId: p.promo.offerId,
            offerSlug: null,
            offerTitle: null,
            countryCode: p.countryCode,
            ctaHref: bestSlug ? `/go/${bestSlug}` : null,
            validUntilIso: p.promo.validUntil ? p.promo.validUntil.toISOString() : null,
          }))
      : [];

    const countryLicense =
      upperCountry === "GLOBAL"
        ? bmCountries.find((c) => c.localLicense)
        : bmCountries.find((c) => c.countryCode === upperCountry);

    return {
      eligibleInCountry,
      requestedCountryCode: upperCountry,
      bookmaker: {
        id: row.bookmaker.id,
        name: row.bookmaker.name,
        slug: row.bookmaker.slug,
        shortCode: buildShortCode(row.bookmaker.name),
        logoUrl: row.logoUrl ?? null,
        foundedYear: row.bookmaker.foundedYear,
        appPlatforms: row.bookmaker.appPlatforms,
        description:
          params.locale === "en" ? row.bookmaker.descriptionEn : row.bookmaker.descriptionFr,
        finalScore: latestRating ? Number(latestRating.finalScore) : null,
        activeOffersCount: activeOffers.length,
        activePromoCount: activePromoCodes.length,
        licenseSummary: countryLicense?.localLicense || countryLicense?.authorityName || null,
        paymentMethods: uniquePayments,
      },
      rating: latestRating
        ? {
            gridVersion: latestRating.gridVersion,
            bonusScore: Number(latestRating.bonusScore),
            paymentsScore: Number(latestRating.paymentsScore),
            oddsScore: Number(latestRating.oddsScore),
            appScore: Number(latestRating.appScore),
            supportScore: Number(latestRating.supportScore),
            finalScore: Number(latestRating.finalScore),
            notes: latestRating.notes,
          }
        : null,
      countryLicenses: bmCountries.map((c) => ({
        countryCode: c.countryCode,
        countryNameFr: c.countryNameFr,
        countryNameEn: c.countryNameEn,
        localLicense: c.localLicense,
        authorityName: c.authorityName,
        countryScore: c.countryScore !== null ? Number(c.countryScore) : null,
      })),
      paymentMethods: uniquePayments,
      activeOffers,
      activePromoCodes,
    };
  });
}
