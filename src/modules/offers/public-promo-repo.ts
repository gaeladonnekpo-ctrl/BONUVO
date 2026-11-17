import "server-only";

import { and, desc, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";
import { withAppDb } from "@/server/db/context";
import {
  affiliateLinks,
  bookmakerCountries,
  bookmakers,
  countries,
  mediaAssets,
  offers,
  promoCodes,
} from "@/server/db/schema";
import { localizeFinancialText } from "@/lib/currency/converter";
import {
  loadCatalogMetaTx,
  selectBestAffiliateSlug,
} from "@/modules/offers/public-catalog-meta-repo";
import { buildShortCode } from "@/modules/offers/public-mappers";
import type { PublicCatalogMeta, PublicPromoCodeItem } from "@/modules/offers/public-types";

export async function listPublicPromoCodesRepo(params: {
  countryCode: string;
  locale?: "fr" | "en";
  bookmakerSlug?: string;
  q?: string;
}): Promise<{ codes: PublicPromoCodeItem[]; meta: PublicCatalogMeta }> {
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
      if (!countryRow) return { codes: [], meta };
      targetCountryId = countryRow.id;
    }

    const rows = await tx
      .select({
        promo: promoCodes,
        bookmaker: bookmakers,
        logoUrl: mediaAssets.publicUrl,
        offer: offers,
        countryCode: countries.code,
      })
      .from(promoCodes)
      .innerJoin(bookmakers, eq(bookmakers.id, promoCodes.bookmakerId))
      .leftJoin(mediaAssets, eq(mediaAssets.id, bookmakers.logoAssetId))
      .leftJoin(offers, eq(offers.id, promoCodes.offerId))
      .leftJoin(countries, eq(countries.id, promoCodes.countryId))
      .where(
        and(
          eq(promoCodes.status, "active"),
          isNull(promoCodes.deletedAt),
          eq(bookmakers.status, "active"),
          isNull(bookmakers.deletedAt),
          or(isNull(promoCodes.validFrom), lte(promoCodes.validFrom, now)),
          or(isNull(promoCodes.validUntil), gt(promoCodes.validUntil, now)),
        ),
      )
      .orderBy(desc(promoCodes.updatedAt));

    if (rows.length === 0) return { codes: [], meta };

    const bmIds = Array.from(new Set(rows.map((r) => r.bookmaker.id)));
    const [bmCountries, links] = await Promise.all([
      tx
        .select({
          bookmakerId: bookmakerCountries.bookmakerId,
          countryId: bookmakerCountries.countryId,
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
    ]);

    const result: PublicPromoCodeItem[] = [];
    for (const row of rows) {
      if (row.offer && (row.offer.status !== "published" || row.offer.deletedAt)) continue;
      if (params.bookmakerSlug && row.bookmaker.slug !== params.bookmakerSlug) continue;
      if (targetCountryId) {
        if (row.promo.countryId && row.promo.countryId !== targetCountryId) continue;
        const bmEligible = bmCountries.some(
          (bc) => bc.bookmakerId === row.bookmaker.id && bc.countryId === targetCountryId,
        );
        if (!bmEligible) continue;
      }
      if (params.q && params.q.trim().length > 0) {
        const needle = params.q.trim().toLowerCase();
        const hay =
          `${row.promo.code} ${row.bookmaker.name} ${row.promo.description}`.toLowerCase();
        if (!hay.includes(needle)) continue;
      }

      const bestSlug = selectBestAffiliateSlug({
        links,
        bookmakerId: row.bookmaker.id,
        offerId: row.offer?.id ?? null,
        countryId: targetCountryId,
      });

      const activeLocale = params.locale ?? "fr";
      const rawTitle = row.offer
        ? activeLocale === "en"
          ? row.offer.titleEn
          : row.offer.titleFr
        : null;

      result.push({
        id: row.promo.id,
        code: row.promo.code,
        description: localizeFinancialText({
          text: row.promo.description,
          targetCurrency: meta.currencyCode,
          locale: activeLocale,
        }),
        bookmakerId: row.bookmaker.id,
        bookmakerName: row.bookmaker.name,
        bookmakerSlug: row.bookmaker.slug,
        bookmakerShortCode: buildShortCode(row.bookmaker.name),
        bookmakerLogoUrl: row.logoUrl ?? null,
        offerId: row.offer?.id ?? null,
        offerSlug: row.offer?.slug ?? null,
        offerTitle: rawTitle
          ? localizeFinancialText({
              text: rawTitle,
              targetCurrency: meta.currencyCode,
              locale: activeLocale,
            })
          : null,
        countryCode: row.countryCode ?? null,
        ctaHref: bestSlug ? `/go/${bestSlug}` : null,
        validUntilIso: row.promo.validUntil ? row.promo.validUntil.toISOString() : null,
      });
    }

    return { codes: result, meta };
  });
}
