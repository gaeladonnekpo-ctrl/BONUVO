import "server-only";

import {
  isReferenceMemoryWarm,
  loadCatalogMetaTx,
  resolveCountryIdOnTx,
  selectBestAffiliateSlug,
} from "@/modules/offers/public-catalog-meta-repo";
import { localizeOfferFields } from "@/modules/offers/public-currency-localize";
import {
  buildShortCode,
  dedupePaymentItems,
  formatVerifiedLabel,
  filterAndRankOffers,
  resolveBookmakerLicenseSummary,
  resolveOfferBadges,
} from "@/modules/offers/public-mappers";
import {
  getRawOffersSnapshotOnTx,
  isOffersSnapshotWarm,
} from "@/modules/offers/public-offers-snapshot";
import type { PublicOffersFilterInput } from "@/modules/offers/public-schema";
import type { PublicCatalogMeta, PublicOfferListItem } from "@/modules/offers/public-types";
import { withAppDb, type AppDbTransaction } from "@/server/db/context";

export async function queryPublishedOffersTx(
  tx: AppDbTransaction,
  params: { countryCode: string; locale: "fr" | "en"; filter?: Partial<PublicOffersFilterInput> },
): Promise<{ offers: PublicOfferListItem[]; meta: PublicCatalogMeta }> {
  const meta = await loadCatalogMetaTx(tx, params.countryCode);
  const upperCountry = params.countryCode.toUpperCase();
  const now = new Date();
  const countryLookup = await resolveCountryIdOnTx(tx, upperCountry);
  if (!countryLookup.found) return { offers: [], meta };
  const targetCountryId = countryLookup.id;

  const snap = await getRawOffersSnapshotOnTx(tx);
  if (!snap) return { offers: [], meta };
  const {
    rawOffers,
    offerCountryRows,
    bmCountryRows,
    ratingRows,
    bmPaymentRows,
    promoRows,
    linkRows,
    highlightRows,
    termRows,
  } = snap;

  const latestScoreByBm = new Map<string, number>();
  for (const row of ratingRows) {
    if (!latestScoreByBm.has(row.bookmakerId)) {
      latestScoreByBm.set(row.bookmakerId, Number(row.finalScore));
    }
  }

  const bookmakersByPromoCode = new Map<string, Set<string>>();
  for (const p of promoRows) {
    const key = p.code.trim().toUpperCase();
    const set = bookmakersByPromoCode.get(key) ?? new Set<string>();
    set.add(p.bookmakerId);
    bookmakersByPromoCode.set(key, set);
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
    const highlights = highlightRows.filter(
      (h) => h.offerId === offer.id && h.locale === params.locale,
    );
    const termsList = termRows.filter((t) => t.offerId === offer.id && t.locale === params.locale);
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
        badgeJustification: offer.badgeJustification,
        isSharedPromoCode: matchingPromo
          ? (bookmakersByPromoCode.get(matchingPromo.code.trim().toUpperCase())?.size ?? 0) > 1
          : false,
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
      licenseLabel:
        resolveBookmakerLicenseSummary({
          localLicense: countryLicense?.localLicense,
          authorityName: countryLicense?.authorityName,
          operatorLicenseNumber: bookmaker.operatorLicenseNumber,
          operatorLicenseAuthority: bookmaker.operatorLicenseAuthority,
        }) ?? undefined,
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
  if (isReferenceMemoryWarm() && isOffersSnapshotWarm()) {
    return queryPublishedOffersTx(null as unknown as AppDbTransaction, params);
  }
  return withAppDb({ scope: "public_catalog" }, (tx) => queryPublishedOffersTx(tx, params));
}
