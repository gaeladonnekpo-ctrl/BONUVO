import "server-only";

import { asc, eq } from "drizzle-orm";
import { compareByBettingPriority, getCountryContinent } from "@/lib/i18n/betting-priority";
import { COUNTRY_OPTIONS, type CountryOption } from "@/lib/i18n/countries";
import {
  getCatalogCacheGeneration,
  PUBLIC_CATALOG_CACHE_TAGS,
  withCatalogCache,
} from "@/server/cache/catalog-tags";
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

type ReferenceSnapshot = {
  activeCountries: Array<{
    id: string;
    code: string;
    nameFr: string;
    nameEn: string;
    currencyCode: string;
    defaultLocale: string;
  }>;
  activePayments: Array<{
    slug: string;
    name: string;
    category: string;
    logoUrl: string | null;
  }>;
  expiresAt: number;
  generation: number;
};

let referenceMemorySnapshot: ReferenceSnapshot | null = null;

export function isReferenceMemoryWarm(): boolean {
  const isTest = process.env.VITEST === "true" || process.env.NODE_ENV === "test";
  return Boolean(
    !isTest &&
    referenceMemorySnapshot &&
    referenceMemorySnapshot.generation === getCatalogCacheGeneration() &&
    referenceMemorySnapshot.expiresAt > Date.now(),
  );
}

export async function getReferenceTablesOnTx(tx: AppDbTransaction): Promise<ReferenceSnapshot> {
  if (isReferenceMemoryWarm()) {
    return referenceMemorySnapshot!;
  }
  const isTest = process.env.VITEST === "true" || process.env.NODE_ENV === "test";
  const gen = getCatalogCacheGeneration();

  const [activeCountries, activePayments] = await Promise.all([
    tx
      .select({
        id: countries.id,
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

  const snap: ReferenceSnapshot = {
    activeCountries,
    activePayments,
    expiresAt: Date.now() + 300_000,
    generation: gen,
  };
  if (!isTest) {
    referenceMemorySnapshot = snap;
  }
  return snap;
}

export async function resolveCountryIdOnTx(
  tx: AppDbTransaction,
  upperCountry: string,
): Promise<{ found: boolean; id: string | null }> {
  if (upperCountry === "GLOBAL") return { found: true, id: null };
  const { activeCountries } = await getReferenceTablesOnTx(tx);
  const match = activeCountries.find((c) => c.code === upperCountry);
  return match ? { found: true, id: match.id } : { found: false, id: null };
}

export async function loadCatalogMetaTx(
  tx: AppDbTransaction,
  countryCode: string,
): Promise<PublicCatalogMeta> {
  const { activeCountries, activePayments } = await getReferenceTablesOnTx(tx);

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
      code: c.code,
      nameFr: c.nameFr,
      nameEn: c.nameEn,
      currencyCode: c.currencyCode,
      defaultLocale: c.defaultLocale === "en" ? "en" : "fr",
    })),
    paymentMethods: activePayments,
  };
}

export async function getPublicCatalogMetaRepo(countryCode: string): Promise<PublicCatalogMeta> {
  if (isReferenceMemoryWarm()) {
    return loadCatalogMetaTx(null as unknown as AppDbTransaction, countryCode);
  }
  return withAppDb({ scope: "public_catalog" }, (tx) => loadCatalogMetaTx(tx, countryCode));
}

const fetchActivePublicCountriesCached = withCatalogCache(
  async (): Promise<CountryOption[]> => {
    const loadCountries = async (tx: AppDbTransaction) => {
      const { activeCountries } = await getReferenceTablesOnTx(tx);
      const mapped: CountryOption[] = [...activeCountries]
        .sort(compareByBettingPriority)
        .map((row) => ({
          code: row.code,
          continent: getCountryContinent(row.code),
          currency: row.currencyCode,
          defaultLocale: row.defaultLocale === "en" ? "en" : "fr",
          nameFr: row.nameFr,
          nameEn: row.nameEn,
        }));

      return [
        {
          code: "GLOBAL",
          continent: "global" as const,
          currency: "EUR",
          defaultLocale: "fr" as const,
        },
        ...mapped,
      ];
    };
    if (isReferenceMemoryWarm()) {
      return loadCountries(null as unknown as AppDbTransaction);
    }
    return withAppDb({ scope: "public_catalog" }, loadCountries);
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
