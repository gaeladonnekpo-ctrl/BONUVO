import "server-only";

import { and, asc, desc, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";
import {
  isReferenceMemoryWarm,
  loadCatalogMetaTx,
  resolveCountryIdOnTx,
} from "@/modules/offers/public-catalog-meta-repo";
import { buildShortCode, getPaymentSortPriority } from "@/modules/offers/public-mappers";
import type { PublicBookmakerListItem, PublicCatalogMeta } from "@/modules/offers/public-types";
import { getCatalogCacheGeneration } from "@/server/cache/catalog-tags";
import { withAppDb, type AppDbTransaction } from "@/server/db/context";
import {
  bookmakerCountries,
  bookmakerPaymentMethods,
  bookmakerRatings,
  bookmakers,
  mediaAssets,
  offers,
  paymentMethods,
  promoCodes,
} from "@/server/db/schema";

async function fetchRawBookmakersSnapshotTx(tx: AppDbTransaction) {
  const now = new Date();
  const rawBms = await tx
    .select({ bookmaker: bookmakers, logoUrl: mediaAssets.publicUrl })
    .from(bookmakers)
    .leftJoin(mediaAssets, eq(mediaAssets.id, bookmakers.logoAssetId))
    .where(and(eq(bookmakers.status, "active"), isNull(bookmakers.deletedAt)))
    .orderBy(asc(bookmakers.name));

  if (rawBms.length === 0) return null;
  const bmIds = rawBms.map((r) => r.bookmaker.id);

  const [bmCountries, bmRatings, bmPayments, activeOffers, activePromos] = await Promise.all([
    tx
      .select()
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
      .select()
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
      .select({
        id: offers.id,
        bookmakerId: offers.bookmakerId,
        slug: offers.slug,
        offerType: offers.offerType,
      })
      .from(offers)
      .where(
        and(
          inArray(offers.bookmakerId, bmIds),
          eq(offers.status, "published"),
          isNull(offers.deletedAt),
          or(isNull(offers.validFrom), lte(offers.validFrom, now)),
          or(isNull(offers.validUntil), gt(offers.validUntil, now)),
        ),
      )
      .orderBy(asc(offers.rankOrder)),
    tx
      .select({ id: promoCodes.id, bookmakerId: promoCodes.bookmakerId })
      .from(promoCodes)
      .where(
        and(
          inArray(promoCodes.bookmakerId, bmIds),
          eq(promoCodes.status, "active"),
          isNull(promoCodes.deletedAt),
        ),
      ),
  ]);

  return { rawBms, bmCountries, bmRatings, bmPayments, activeOffers, activePromos };
}

type RawBookmakersSnapshot = Awaited<ReturnType<typeof fetchRawBookmakersSnapshotTx>>;
let bookmakersMemoryCache: {
  data: RawBookmakersSnapshot;
  expiresAt: number;
  generation: number;
} | null = null;

async function getRawBookmakersSnapshotOnTx(tx: AppDbTransaction): Promise<RawBookmakersSnapshot> {
  const isTest = process.env.VITEST === "true" || process.env.NODE_ENV === "test";
  const gen = getCatalogCacheGeneration();
  if (
    !isTest &&
    bookmakersMemoryCache &&
    bookmakersMemoryCache.generation === gen &&
    bookmakersMemoryCache.expiresAt > Date.now()
  ) {
    return bookmakersMemoryCache.data;
  }
  const data = await fetchRawBookmakersSnapshotTx(tx);
  if (!isTest) {
    bookmakersMemoryCache = { data, expiresAt: Date.now() + 300_000, generation: gen };
  }
  return data;
}

export async function listPublicBookmakersRepo(params: {
  countryCode: string;
}): Promise<{ bookmakers: PublicBookmakerListItem[]; meta: PublicCatalogMeta }> {
  const isWarm =
    process.env.VITEST !== "true" &&
    process.env.NODE_ENV !== "test" &&
    isReferenceMemoryWarm() &&
    bookmakersMemoryCache &&
    bookmakersMemoryCache.generation === getCatalogCacheGeneration() &&
    bookmakersMemoryCache.expiresAt > Date.now();

  const runOnTx = async (tx: AppDbTransaction) => {
    const meta = await loadCatalogMetaTx(tx, params.countryCode);
    const upperCountry = params.countryCode.toUpperCase();
    const countryLookup = await resolveCountryIdOnTx(tx, upperCountry);
    if (!countryLookup.found) return { bookmakers: [], meta };
    const targetCountryId = countryLookup.id;

    const snap = await getRawBookmakersSnapshotOnTx(tx);
    if (!snap) return { bookmakers: [], meta };
    const { rawBms, bmCountries, bmRatings, bmPayments, activeOffers, activePromos } = snap;

    const items: PublicBookmakerListItem[] = [];
    for (const { bookmaker, logoUrl } of rawBms) {
      if (
        targetCountryId &&
        !bmCountries.some(
          (bc) => bc.bookmakerId === bookmaker.id && bc.countryId === targetCountryId,
        )
      ) {
        continue;
      }

      const rating = bmRatings.find((r) => r.bookmakerId === bookmaker.id);
      const countryEntry = targetCountryId
        ? bmCountries.find(
            (bc) => bc.bookmakerId === bookmaker.id && bc.countryId === targetCountryId,
          )
        : bmCountries.find((bc) => bookmaker.id === bc.bookmakerId && bc.localLicense);

      const paymentsMap = new Map<
        string,
        { slug: string; name: string; category: string; logoUrl: string | null }
      >();
      for (const p of bmPayments) {
        if (p.bookmakerId !== bookmaker.id) continue;
        if (targetCountryId && p.countryId !== targetCountryId) continue;
        if (!paymentsMap.has(p.slug)) {
          paymentsMap.set(p.slug, {
            slug: p.slug,
            name: p.name,
            category: p.category,
            logoUrl: p.logoUrl ?? null,
          });
        }
      }

      const bmOffers = activeOffers.filter((o) => o.bookmakerId === bookmaker.id);
      const primaryOffer = bmOffers.find((o) => o.offerType === "welcome") ?? bmOffers[0];

      items.push({
        id: bookmaker.id,
        name: bookmaker.name,
        slug: bookmaker.slug,
        shortCode: buildShortCode(bookmaker.name),
        logoUrl: logoUrl ?? null,
        foundedYear: bookmaker.foundedYear,
        appPlatforms: bookmaker.appPlatforms,
        finalScore: rating ? Number(rating.finalScore) : null,
        licenseSummary: countryEntry?.localLicense || countryEntry?.authorityName || null,
        activeOffersCount: bmOffers.length,
        activePromoCount: activePromos.filter((p) => p.bookmakerId === bookmaker.id).length,
        paymentMethods: Array.from(paymentsMap.values()).sort(
          (a, b) => getPaymentSortPriority(a) - getPaymentSortPriority(b),
        ),
        primaryOfferSlug: primaryOffer?.slug ?? null,
      });
    }

    return { bookmakers: items, meta };
  };

  if (isWarm) {
    return runOnTx(null as unknown as AppDbTransaction);
  }
  return withAppDb({ scope: "public_catalog" }, runOnTx);
}
