import "server-only";

import { and, asc, eq, gt, isNull, lte, or } from "drizzle-orm";
import { withAppDb } from "@/server/db/context";
import {
  bookmakerCountries,
  bookmakers,
  countries,
  offerCountries,
  offerHighlights,
  offerTerms,
  offers,
} from "@/server/db/schema";
import { localizeFinancialText } from "@/lib/currency/converter";
import { loadCatalogMetaTx } from "@/modules/offers/public-catalog-meta-repo";
import { listPublicOffersRepo, queryPublishedOffersTx } from "@/modules/offers/public-offers-repo";
import type {
  PublicCatalogMeta,
  PublicOfferDetailData,
  PublicOfferListItem,
} from "@/modules/offers/public-types";

export async function getPublicOfferBySlugRepo(params: {
  slug: string;
  countryCode: string;
  locale: "fr" | "en";
}): Promise<PublicOfferDetailData | null> {
  return withAppDb({ scope: "public_catalog" }, async (tx) => {
    const now = new Date();
    const [offerRow] = await tx
      .select({ offer: offers, bookmaker: bookmakers })
      .from(offers)
      .innerJoin(bookmakers, eq(bookmakers.id, offers.bookmakerId))
      .where(
        and(
          eq(offers.slug, params.slug),
          eq(offers.status, "published"),
          isNull(offers.deletedAt),
          eq(bookmakers.status, "active"),
          isNull(bookmakers.deletedAt),
          or(isNull(offers.validFrom), lte(offers.validFrom, now)),
          or(isNull(offers.validUntil), gt(offers.validUntil, now)),
        ),
      );

    if (!offerRow) return null;

    const [eligibleCountryRows, bmCountryRows, termsRows, highlightRows] = await Promise.all([
      tx
        .select({
          code: countries.code,
          nameFr: countries.nameFr,
          nameEn: countries.nameEn,
          currencyCode: countries.currencyCode,
          defaultLocale: countries.defaultLocale,
        })
        .from(offerCountries)
        .innerJoin(countries, eq(countries.id, offerCountries.countryId))
        .where(and(eq(offerCountries.offerId, offerRow.offer.id), eq(countries.active, true)))
        .orderBy(asc(countries.code)),
      tx
        .select({ code: countries.code })
        .from(bookmakerCountries)
        .innerJoin(countries, eq(countries.id, bookmakerCountries.countryId))
        .where(
          and(
            eq(bookmakerCountries.bookmakerId, offerRow.bookmaker.id),
            eq(bookmakerCountries.eligible, true),
            eq(bookmakerCountries.status, "active"),
            isNull(bookmakerCountries.deletedAt),
            eq(countries.active, true),
          ),
        ),
      tx
        .select()
        .from(offerTerms)
        .where(
          and(
            eq(offerTerms.offerId, offerRow.offer.id),
            eq(offerTerms.locale, params.locale),
            eq(offerTerms.status, "active"),
            isNull(offerTerms.deletedAt),
          ),
        )
        .orderBy(asc(offerTerms.sortOrder)),
      tx
        .select()
        .from(offerHighlights)
        .where(
          and(
            eq(offerHighlights.offerId, offerRow.offer.id),
            eq(offerHighlights.locale, params.locale),
            eq(offerHighlights.status, "active"),
            isNull(offerHighlights.deletedAt),
          ),
        )
        .orderBy(asc(offerHighlights.sortOrder)),
    ]);

    const bmAllowedSet = new Set(bmCountryRows.map((c) => c.code));
    const eligibleCountries = eligibleCountryRows
      .filter((c) => bmAllowedSet.has(c.code))
      .map((c) => ({
        ...c,
        defaultLocale: (c.defaultLocale === "en" ? "en" : "fr") as "fr" | "en",
      }));

    const upperCountry = params.countryCode.toUpperCase();
    const eligibleInCountry =
      upperCountry === "GLOBAL" || eligibleCountries.some((c) => c.code === upperCountry);

    const [{ offers: countryOffers }, meta] = await Promise.all([
      queryPublishedOffersTx(tx, {
        countryCode: eligibleInCountry ? upperCountry : "GLOBAL",
        locale: params.locale,
      }),
      loadCatalogMetaTx(tx, upperCountry),
    ]);

    const fullItem = countryOffers.find((item) => item.id === offerRow.offer.id);
    if (!fullItem) return null;

    if (!eligibleInCountry) {
      // B11: never expose redirect link or promo code for an ineligible country
      return {
        eligibleInCountry: false,
        requestedCountryCode: upperCountry,
        offer: {
          ...fullItem,
          ctaHref: undefined,
          promoCode: undefined,
          promoCodeId: null,
        },
        terms: [],
        positiveHighlights: [],
        negativeHighlights: [],
        eligibleCountries,
        neighboringOffers: [],
      };
    }

    const locText = (text: string) =>
      localizeFinancialText({ text, targetCurrency: meta.currencyCode, locale: params.locale });

    return {
      eligibleInCountry: true,
      requestedCountryCode: upperCountry,
      offer: fullItem,
      terms: termsRows.map((t) => ({
        id: t.id,
        title: locText(t.title),
        body: locText(t.body),
      })),
      positiveHighlights: highlightRows
        .filter((h) => h.polarity === "positive")
        .map((h) => locText(h.label)),
      negativeHighlights: highlightRows
        .filter((h) => h.polarity === "negative")
        .map((h) => locText(h.label)),
      eligibleCountries,
      neighboringOffers: countryOffers.filter((item) => item.id !== fullItem.id).slice(0, 3),
    };
  });
}

export async function comparePublicOffersRepo(params: {
  slugs: string[];
  countryCode: string;
  locale: "fr" | "en";
}): Promise<{ items: PublicOfferListItem[]; meta: PublicCatalogMeta }> {
  const uniqueSlugs = Array.from(new Set(params.slugs)).slice(0, 3);
  const { offers: eligibleOffers, meta } = await listPublicOffersRepo({
    countryCode: params.countryCode,
    locale: params.locale,
  });

  if (uniqueSlugs.length === 0) return { items: [], meta };
  const bySlug = new Map(eligibleOffers.map((item) => [item.offerSlug, item]));
  return {
    items: uniqueSlugs
      .map((slug) => bySlug.get(slug))
      .filter((item): item is PublicOfferListItem => Boolean(item)),
    meta,
  };
}
