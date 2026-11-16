import "server-only";

import { asc, eq } from "drizzle-orm";
import { withAppDb, type AppDbTransaction } from "@/server/db/context";
import { countries, paymentMethods } from "@/server/db/schema";
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
      })
      .from(paymentMethods)
      .where(eq(paymentMethods.active, true))
      .orderBy(asc(paymentMethods.name)),
  ]);

  const normalized = countryCode.toUpperCase();
  const isCountryCovered =
    normalized === "GLOBAL" || activeCountries.some((c) => c.code === normalized);

  return {
    countryCode: normalized,
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
