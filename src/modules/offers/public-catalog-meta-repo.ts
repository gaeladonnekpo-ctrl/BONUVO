import "server-only";

import { asc, eq } from "drizzle-orm";
import { compareByBettingPriority, getCountryContinent } from "@/lib/i18n/betting-priority";
import { COUNTRY_OPTIONS, type CountryOption } from "@/lib/i18n/countries";
import { PUBLIC_CATALOG_CACHE_TAGS, withCatalogCache } from "@/server/cache/catalog-tags";
import { withAppDb, type AppDbTransaction } from "@/server/db/context";
import { countries, mediaAssets, paymentMethods } from "@/server/db/schema";
import type { PublicCatalogMeta } from "@/modules/offers/public-types";

export function selectBestAffiliateSlug(params: {
  links: Array<{
    slug: string;
    bookmakerId: string;
    offerId: string | null;
    countryId: string | null;
  }>;
  bookmakerId: string;
  offerId: string | null;
  countryId: string | null;
}): string | null {
  const candidates = params.links.filter((l) => l.bookmakerId === params.bookmakerId);
  if (candidates.length === 0) return null;

  const findMatch = (offerMatch: string | null | "any", countryMatch: string | null | "any") =>
    candidates.find(
      (l) =>
        (offerMatch === "any" || l.offerId === offerMatch) &&
        (countryMatch === "any" || l.countryId === countryMatch),
    );

  const chosen =
    (params.offerId && params.countryId && findMatch(params.offerId, params.countryId)) ||
    (params.offerId && findMatch(params.offerId, null)) ||
    (params.countryId && findMatch(null, params.countryId)) ||
    findMatch(null, null) ||
    (!params.countryId ? candidates[0] : null);

  return chosen ? chosen.slug : null;
}

export async function loadCatalogMetaTx(
  tx: AppDbTransaction,
  countryCode: string,
): Promise<PublicCatalogMeta> {
  const [activeCountries, activePayments] = await Promise.all([
    tx
      .select({
        code: countries.code,
        nameFr: countries.nameFr,
        nameEn: countries.nameEn,
        currencyCode: countries.currencyCode,
        defaultLocale: countries.defaultLocale,
      })
      .from(countries)
      .where(eq(countries.active, true))
      .orderBy(asc(countries.code)),
    tx
      .select({
        slug: paymentMethods.slug,
        name: paymentMethods.name,
        category: paymentMethods.category,
        logoUrl: mediaAssets.publicUrl,
      })
      .from(paymentMethods)
      .leftJoin(mediaAssets, eq(mediaAssets.id, paymentMethods.logoAssetId))
      .where(eq(paymentMethods.active, true))
      .orderBy(asc(paymentMethods.name)),
  ]);

  const normalized = countryCode.toUpperCase();
  const dbCountry = activeCountries.find((c) => c.code === normalized);
  const fallbackOption = COUNTRY_OPTIONS.find((c) => c.code === normalized);
  const currencyCode = dbCountry?.currencyCode ?? fallbackOption?.currency ?? "EUR";
  const isCountryCovered = normalized === "GLOBAL" || Boolean(dbCountry);

  return {
    countryCode: normalized,
    currencyCode,
    isCountryCovered,
    activeCountries: activeCountries.map((c) => ({
      ...c,
      defaultLocale: c.defaultLocale === "en" ? "en" : "fr",
    })),
    paymentMethods: activePayments,
  };
}

export async function getPublicCatalogMetaRepo(countryCode: string): Promise<PublicCatalogMeta> {
  return withAppDb({ scope: "public_catalog" }, (tx) => loadCatalogMetaTx(tx, countryCode));
}

const fetchActivePublicCountriesCached = withCatalogCache(
  async (): Promise<CountryOption[]> => {
    return withAppDb({ scope: "public_catalog" }, async (tx) => {
      const rows = await tx
        .select({
          code: countries.code,
          nameFr: countries.nameFr,
          nameEn: countries.nameEn,
          currencyCode: countries.currencyCode,
          defaultLocale: countries.defaultLocale,
        })
        .from(countries)
        .where(eq(countries.active, true));

      const mapped: CountryOption[] = rows.sort(compareByBettingPriority).map((row) => ({
        code: row.code,
        continent: getCountryContinent(row.code),
        currency: row.currencyCode,
        defaultLocale: row.defaultLocale === "en" ? "en" : "fr",
        nameFr: row.nameFr,
        nameEn: row.nameEn,
      }));

      return [
        { code: "GLOBAL", continent: "global", currency: "EUR", defaultLocale: "fr" },
        ...mapped,
      ];
    });
  },
  ["public-active-countries"],
  [PUBLIC_CATALOG_CACHE_TAGS.countries],
  300,
);

export async function listActivePublicCountryOptionsRepo(): Promise<CountryOption[]> {
  try {
    return await fetchActivePublicCountriesCached();
  } catch {
    return [...COUNTRY_OPTIONS];
  }
}
