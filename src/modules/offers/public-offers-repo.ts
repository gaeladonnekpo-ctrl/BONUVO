import "server-only";

import { and, asc, desc, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";
import { withAppDb, type AppDbTransaction } from "@/server/db/context";
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
import {
  loadCatalogMetaTx,
  selectBestAffiliateSlug,
} from "@/modules/offers/public-catalog-meta-repo";
import { localizeOfferFields } from "@/modules/offers/public-currency-localize";
import {
  buildShortCode,
  dedupePaymentItems,
  formatVerifiedLabel,
  filterAndRankOffers,
  resolveOfferBadges,
} from "@/modules/offers/public-mappers";
import type { PublicOffersFilterInput } from "@/modules/offers/public-schema";
import type { PublicCatalogMeta, PublicOfferListItem } from "@/modules/offers/public-types";

export async function queryPublishedOffersTx(
  tx: AppDbTransaction,
  params: { countryCode: string; locale: "fr" | "en"; filter?: Partial<PublicOffersFilterInput> },
): Promise<{ offers: PublicOfferListItem[]; meta: PublicCatalogMeta }> {
  const meta = await loadCatalogMetaTx(tx, params.countryCode);
  const upperCountry = params.countryCode.toUpperCase();
  const now = new Date();

  let targetCountryId: string | null = null;
  if (upperCountry !== "GLOBAL") {
    const [countryRow] = await tx
      .select({ id: countries.id })
      .from(countries)
      .where(and(eq(countries.code, upperCountry), eq(countries.active, true)));
    if (!countryRow) return { offers: [], meta };
    targetCountryId = countryRow.id;
  }

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

  if (rawOffers.length === 0) return { offers: [], meta };

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
        and(inArray(bookmakerPaymentMethods.bookmakerId, bmIds), eq(paymentMethods.active, true)),
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
          eq(offerHighlights.locale, params.locale),
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
          eq(offerTerms.locale, params.locale),
          eq(offerTerms.status, "active"),
          isNull(offerTerms.deletedAt),
        ),
      )
      .orderBy(asc(offerTerms.sortOrder)),
  ]);

  const latestScoreByBm = new Map<string, number>();
  for (const row of ratingRows) {
    if (!latestScoreByBm.has(row.bookmakerId)) {
      latestScoreByBm.set(row.bookmakerId, Number(row.finalScore));
    }
  }

  const mapped: PublicOfferListItem[] = [];
  for (const { offer, bookmaker, logoUrl } of rawOffers) {
    const eligibleCountries = offerCountryRows.filter((c) => c.offerId === offer.id);
    if (targetCountryId) {
      const okOffer = eligibleCountries.some((c) => c.countryId === targetCountryId);
      const okBm = bmCountryRows.some(
        (bc) => bc.bookmakerId === bookmaker.id && bc.countryId === targetCountryId,
      );
      if (!okOffer || !okBm) continue;
    }

    const countryLicense = targetCountryId
      ? bmCountryRows.find(
          (bc) => bc.bookmakerId === bookmaker.id && bc.countryId === targetCountryId,
        )
      : undefined;
    const uniqueBmPayments = dedupePaymentItems(
      bmPaymentRows.filter(
        (p) =>
          p.bookmakerId === bookmaker.id && (!targetCountryId || p.countryId === targetCountryId),
      ),
    );
    const matchingPromo =
      promoRows.find(
        (p) => p.offerId === offer.id && (!targetCountryId || p.countryId === targetCountryId),
      ) ??
      promoRows.find((p) => p.offerId === offer.id && p.countryId === null) ??
      promoRows.find(
        (p) =>
          p.bookmakerId === bookmaker.id &&
          p.offerId === null &&
          (!targetCountryId || p.countryId === targetCountryId || p.countryId === null),
      );

    const bestSlug = selectBestAffiliateSlug({
      links: linkRows,
      bookmakerId: bookmaker.id,
      offerId: offer.id,
      countryId: targetCountryId,
    });
    const highlights = highlightRows.filter((h) => h.offerId === offer.id);
    const termsList = termRows.filter((t) => t.offerId === offer.id);
    const countryOverrideRank = targetCountryId
      ? eligibleCountries.find((c) => c.countryId === targetCountryId)?.rankOverride
      : null;

    mapped.push({
      id: offer.id,
      offerSlug: offer.slug,
      offerType: offer.offerType,
      bookmakerId: bookmaker.id,
      bookmakerSlug: bookmaker.slug,
      bookmakerName: bookmaker.name,
      bookmakerShortName: buildShortCode(bookmaker.name),
      bookmakerLogoUrl: logoUrl ?? null,
      ...localizeOfferFields({
        sourceCurrency: offer.currencyCode,
        targetCurrency: meta.currencyCode,
        locale: params.locale,
        bonusAmount: offer.bonusAmount,
        bonusPercentage: offer.bonusPercentage,
        minDeposit: offer.minDeposit,
        headline: params.locale === "en" ? offer.titleEn : offer.titleFr,
        positiveHighlights: highlights.filter((h) => h.polarity === "positive").map((h) => h.label),
        negativeHighlight: highlights.find((h) => h.polarity === "negative")?.label,
        rolloverText: offer.rolloverText || undefined,
        termsSummary:
          termsList.length > 0
            ? termsList.map((t) => `${t.title}: ${t.body}`).join(" · ")
            : undefined,
      }),
      bonusPercentage: offer.bonusPercentage,
      minOddsNumber: offer.minOdds !== null ? Number(offer.minOdds) : null,
      ratingScore: latestScoreByBm.get(bookmaker.id) ?? null,
      ratingMax: 10,
      badges: resolveOfferBadges({
        badgeCode: offer.badgeCode,
        createdAt: offer.createdAt,
        lastVerifiedAt: offer.lastVerifiedAt,
        now,
      }),
      paymentMethods: uniqueBmPayments.map((p) => p.name),
      paymentMethodItems: uniqueBmPayments,
      paymentMethodSlugs: uniqueBmPayments.map((p) => p.slug),
      promoCode: matchingPromo?.code,
      promoCodeId: matchingPromo?.id ?? null,
      ctaHref: bestSlug ? `/go/${bestSlug}` : undefined,
      verifiedDateLabel: formatVerifiedLabel(offer.lastVerifiedAt, params.locale),
      licenseLabel: countryLicense?.localLicense || countryLicense?.authorityName || undefined,
      lastVerifiedIso: offer.lastVerifiedAt ? offer.lastVerifiedAt.toISOString() : null,
      updatedAtIso: offer.updatedAt.toISOString(),
      effectiveRank: countryOverrideRank ?? offer.rankOrder,
      eligibleCountryCodes: eligibleCountries.map((c) => c.code),
    });
  }

  return { offers: filterAndRankOffers(mapped, params.filter ?? {}), meta };
}

export async function listPublicOffersRepo(params: {
  countryCode: string;
  locale: "fr" | "en";
  filter?: Partial<PublicOffersFilterInput>;
}): Promise<{ offers: PublicOfferListItem[]; meta: PublicCatalogMeta }> {
  return withAppDb({ scope: "public_catalog" }, (tx) => queryPublishedOffersTx(tx, params));
}
