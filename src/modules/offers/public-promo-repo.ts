import "server-only";

import { and, desc, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";
import { localizeFinancialText } from "@/lib/currency/converter";
import {
  isReferenceMemoryWarm,
  loadCatalogMetaTx,
  resolveCountryIdOnTx,
  selectBestAffiliateSlug,
} from "@/modules/offers/public-catalog-meta-repo";
import { buildShortCode } from "@/modules/offers/public-mappers";
import type { PublicCatalogMeta, PublicPromoCodeItem } from "@/modules/offers/public-types";
import { getCatalogCacheGeneration } from "@/server/cache/catalog-tags";
import { withAppDb, type AppDbTransaction } from "@/server/db/context";
import {
  affiliateLinks,
  bookmakerCountries,
  bookmakers,
  countries,
  mediaAssets,
  offers,
  promoCodes,
} from "@/server/db/schema";

async function fetchRawPromosSnapshotTx(tx: AppDbTransaction) {
  const now = new Date();
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

  if (rows.length === 0) return null;

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

  return { rows, bmCountries, links };
}

type RawPromosSnapshot = Awaited<ReturnType<typeof fetchRawPromosSnapshotTx>>;
let promosMemoryCache: { data: RawPromosSnapshot; expiresAt: number; generation: number } | null =
  null;

async function getRawPromosSnapshotOnTx(tx: AppDbTransaction): Promise<RawPromosSnapshot> {
  const isTest = process.env.VITEST === "true" || process.env.NODE_ENV === "test";
  const gen = getCatalogCacheGeneration();
  if (
    !isTest &&
    promosMemoryCache &&
    promosMemoryCache.generation === gen &&
    promosMemoryCache.expiresAt > Date.now()
  ) {
    return promosMemoryCache.data;
  }
  const data = await fetchRawPromosSnapshotTx(tx);
  if (!isTest) {
    promosMemoryCache = { data, expiresAt: Date.now() + 300_000, generation: gen };
  }
  return data;
}

export async function listPublicPromoCodesRepo(params: {
  countryCode: string;
  locale?: "fr" | "en";
  bookmakerSlug?: string;
  q?: string;
}): Promise<{ codes: PublicPromoCodeItem[]; meta: PublicCatalogMeta }> {
  const isWarm =
    process.env.VITEST !== "true" &&
    process.env.NODE_ENV !== "test" &&
    isReferenceMemoryWarm() &&
    promosMemoryCache &&
    promosMemoryCache.generation === getCatalogCacheGeneration() &&
    promosMemoryCache.expiresAt > Date.now();

  const runOnTx = async (tx: AppDbTransaction) => {
    const meta = await loadCatalogMetaTx(tx, params.countryCode);
    const upperCountry = params.countryCode.toUpperCase();
    const countryLookup = await resolveCountryIdOnTx(tx, upperCountry);
    if (!countryLookup.found) return { codes: [], meta };
    const targetCountryId = countryLookup.id;

    const snap = await getRawPromosSnapshotOnTx(tx);
    if (!snap) return { codes: [], meta };
    const { rows, bmCountries, links } = snap;

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
        validUntilIso: row.promo.validUntil ? row.promo.validUntil.toISOString() : null,
        ctaHref: bestSlug ? `/go/${bestSlug}` : null,
      });
    }

    return { codes: result, meta };
  };

  if (isWarm) {
    return runOnTx(null as unknown as AppDbTransaction);
  }
  return withAppDb({ scope: "public_catalog" }, runOnTx);
}
