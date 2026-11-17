import "server-only";

import { PUBLIC_CATALOG_CACHE_TAGS, withCatalogCache } from "@/server/cache/catalog-tags";
import { compareSlugsSchema, publicOffersFilterSchema } from "@/modules/offers/public-schema";
import { getPublicBookmakerBySlugRepo } from "@/modules/offers/public-bookmaker-detail-repo";
import { listPublicBookmakersRepo } from "@/modules/offers/public-bookmakers-repo";
import { getPublicCatalogMetaRepo } from "@/modules/offers/public-catalog-meta-repo";
import {
  comparePublicOffersRepo,
  getPublicOfferBySlugRepo,
} from "@/modules/offers/public-offer-detail-repo";
import { listPublicOffersRepo } from "@/modules/offers/public-offers-repo";
import { listPublicPromoCodesRepo } from "@/modules/offers/public-promo-repo";

const getCatalogMetaCached = withCatalogCache(
  async (countryCode: string) => getPublicCatalogMetaRepo(countryCode),
  ["public-catalog-meta"],
  [PUBLIC_CATALOG_CACHE_TAGS.countries],
  300,
);

const listOffersCached = withCatalogCache(
  async (countryCode: string, locale: "fr" | "en", filterJson: string) => {
    const parsed = publicOffersFilterSchema.parse(JSON.parse(filterJson));
    return listPublicOffersRepo({ countryCode, locale, filter: parsed });
  },
  ["public-offers-list"],
  [
    PUBLIC_CATALOG_CACHE_TAGS.offers,
    PUBLIC_CATALOG_CACHE_TAGS.bookmakers,
    PUBLIC_CATALOG_CACHE_TAGS.countries,
  ],
  300,
);

const getOfferCached = withCatalogCache(
  async (slug: string, countryCode: string, locale: "fr" | "en") =>
    getPublicOfferBySlugRepo({ slug, countryCode, locale }),
  ["public-offer-detail"],
  [
    PUBLIC_CATALOG_CACHE_TAGS.offers,
    PUBLIC_CATALOG_CACHE_TAGS.bookmakers,
    PUBLIC_CATALOG_CACHE_TAGS.promoCodes,
  ],
  300,
);

const listBookmakersCached = withCatalogCache(
  async (countryCode: string) => listPublicBookmakersRepo({ countryCode }),
  ["public-bookmakers-list"],
  [
    PUBLIC_CATALOG_CACHE_TAGS.bookmakers,
    PUBLIC_CATALOG_CACHE_TAGS.offers,
    PUBLIC_CATALOG_CACHE_TAGS.countries,
  ],
  300,
);

const getBookmakerCached = withCatalogCache(
  async (slug: string, countryCode: string, locale: "fr" | "en") =>
    getPublicBookmakerBySlugRepo({ slug, countryCode, locale }),
  ["public-bookmaker-detail"],
  [
    PUBLIC_CATALOG_CACHE_TAGS.bookmakers,
    PUBLIC_CATALOG_CACHE_TAGS.offers,
    PUBLIC_CATALOG_CACHE_TAGS.promoCodes,
  ],
  300,
);

const listPromoCodesCached = withCatalogCache(
  async (countryCode: string, locale: "fr" | "en", bookmakerSlug?: string, q?: string) =>
    listPublicPromoCodesRepo({ countryCode, locale, bookmakerSlug, q }),
  ["public-promo-codes"],
  [
    PUBLIC_CATALOG_CACHE_TAGS.promoCodes,
    PUBLIC_CATALOG_CACHE_TAGS.bookmakers,
    PUBLIC_CATALOG_CACHE_TAGS.offers,
  ],
  300,
);

const compareOffersCached = withCatalogCache(
  async (slugsJson: string, countryCode: string, locale: "fr" | "en") => {
    const slugs = compareSlugsSchema.parse(JSON.parse(slugsJson));
    return comparePublicOffersRepo({ slugs, countryCode, locale });
  },
  ["public-compare-offers"],
  [PUBLIC_CATALOG_CACHE_TAGS.offers, PUBLIC_CATALOG_CACHE_TAGS.bookmakers],
  300,
);

export async function getCatalogMeta(countryCode: string) {
  return getCatalogMetaCached(countryCode.toUpperCase());
}

export async function listOffers(params: {
  countryCode: string;
  locale: "fr" | "en";
  filter?: Record<string, unknown>;
}) {
  const parsed = publicOffersFilterSchema.parse(params.filter ?? {});
  return listOffersCached(params.countryCode.toUpperCase(), params.locale, JSON.stringify(parsed));
}

export async function getOffer(params: { slug: string; countryCode: string; locale: "fr" | "en" }) {
  const cleanSlug = params.slug.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cleanSlug)) return null;
  return getOfferCached(cleanSlug, params.countryCode.toUpperCase(), params.locale);
}

export async function listBookmakers(countryCode: string) {
  return listBookmakersCached(countryCode.toUpperCase());
}

export async function getBookmaker(params: {
  slug: string;
  countryCode: string;
  locale: "fr" | "en";
}) {
  const cleanSlug = params.slug.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cleanSlug)) return null;
  return getBookmakerCached(cleanSlug, params.countryCode.toUpperCase(), params.locale);
}

export async function listPromoCodes(params: {
  countryCode: string;
  locale?: "fr" | "en";
  bookmakerSlug?: string;
  q?: string;
}) {
  return listPromoCodesCached(
    params.countryCode.toUpperCase(),
    params.locale ?? "fr",
    params.bookmakerSlug?.trim().toLowerCase() || undefined,
    params.q?.trim().slice(0, 80) || undefined,
  );
}

export async function compareOffers(params: {
  slugs: string[];
  countryCode: string;
  locale: "fr" | "en";
}) {
  const cleaned = compareSlugsSchema.parse(params.slugs);
  return compareOffersCached(
    JSON.stringify(cleaned),
    params.countryCode.toUpperCase(),
    params.locale,
  );
}
