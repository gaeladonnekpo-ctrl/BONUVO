import "server-only";

import { and, asc, desc, eq, ilike, isNull, or } from "drizzle-orm";
import { withAppDb } from "@/server/db/context";
import {
  bookmakerCountries,
  bookmakerPaymentMethods,
  bookmakerRatings,
  bookmakers,
  countries,
  mediaAssets,
  paymentMethods,
} from "@/server/db/schema";

export interface BookmakerListFilter {
  search?: string;
  status?: string;
}

export async function listBookmakersRepo(actorId: string, filter: BookmakerListFilter = {}) {
  return withAppDb({ scope: "user_session", actorId }, async (tx) => {
    const conditions = [isNull(bookmakers.deletedAt)];
    if (filter.status && filter.status !== "all") {
      conditions.push(eq(bookmakers.status, filter.status as "active" | "inactive" | "archived"));
    }
    if (filter.search?.trim()) {
      const q = `%${filter.search.trim()}%`;
      conditions.push(or(ilike(bookmakers.name, q), ilike(bookmakers.slug, q))!);
    }

    return tx
      .select({
        id: bookmakers.id,
        name: bookmakers.name,
        slug: bookmakers.slug,
        logoAssetId: bookmakers.logoAssetId,
        logoUrl: mediaAssets.publicUrl,
        allowedHosts: bookmakers.allowedHosts,
        appPlatforms: bookmakers.appPlatforms,
        foundedYear: bookmakers.foundedYear,
        status: bookmakers.status,
        updatedAt: bookmakers.updatedAt,
      })
      .from(bookmakers)
      .leftJoin(mediaAssets, eq(bookmakers.logoAssetId, mediaAssets.id))
      .where(and(...conditions))
      .orderBy(asc(bookmakers.name));
  });
}

export async function getBookmakerByIdRepo(actorId: string, bookmakerId: string) {
  return withAppDb({ scope: "user_session", actorId }, async (tx) => {
    const [bookmaker] = await tx
      .select({
        id: bookmakers.id,
        name: bookmakers.name,
        slug: bookmakers.slug,
        logoAssetId: bookmakers.logoAssetId,
        logoUrl: mediaAssets.publicUrl,
        descriptionFr: bookmakers.descriptionFr,
        descriptionEn: bookmakers.descriptionEn,
        foundedYear: bookmakers.foundedYear,
        appPlatforms: bookmakers.appPlatforms,
        allowedHosts: bookmakers.allowedHosts,
        status: bookmakers.status,
        deletedAt: bookmakers.deletedAt,
        createdAt: bookmakers.createdAt,
        updatedAt: bookmakers.updatedAt,
      })
      .from(bookmakers)
      .leftJoin(mediaAssets, eq(bookmakers.logoAssetId, mediaAssets.id))
      .where(eq(bookmakers.id, bookmakerId));

    if (!bookmaker) return null;

    const countryRows = await tx
      .select({
        id: bookmakerCountries.id,
        countryId: bookmakerCountries.countryId,
        countryCode: countries.code,
        countryNameFr: countries.nameFr,
        eligible: bookmakerCountries.eligible,
        localLicense: bookmakerCountries.localLicense,
        authorityName: bookmakerCountries.authorityName,
        countryScore: bookmakerCountries.countryScore,
        notes: bookmakerCountries.notes,
      })
      .from(bookmakerCountries)
      .innerJoin(countries, eq(bookmakerCountries.countryId, countries.id))
      .where(
        and(eq(bookmakerCountries.bookmakerId, bookmakerId), isNull(bookmakerCountries.deletedAt)),
      )
      .orderBy(asc(countries.nameFr));

    const paymentRows = await tx
      .select({
        id: bookmakerPaymentMethods.id,
        paymentMethodId: bookmakerPaymentMethods.paymentMethodId,
        paymentMethodName: paymentMethods.name,
        countryId: bookmakerPaymentMethods.countryId,
        countryCode: countries.code,
        minDepositAmount: bookmakerPaymentMethods.minDepositAmount,
        currencyCode: bookmakerPaymentMethods.currencyCode,
        supportsDeposit: bookmakerPaymentMethods.supportsDeposit,
        supportsWithdrawal: bookmakerPaymentMethods.supportsWithdrawal,
      })
      .from(bookmakerPaymentMethods)
      .innerJoin(paymentMethods, eq(bookmakerPaymentMethods.paymentMethodId, paymentMethods.id))
      .innerJoin(countries, eq(bookmakerPaymentMethods.countryId, countries.id))
      .where(eq(bookmakerPaymentMethods.bookmakerId, bookmakerId))
      .orderBy(asc(countries.code), asc(paymentMethods.name));

    const ratingRows = await tx
      .select()
      .from(bookmakerRatings)
      .where(eq(bookmakerRatings.bookmakerId, bookmakerId))
      .orderBy(desc(bookmakerRatings.scoredAt))
      .limit(10);

    return {
      bookmaker,
      countries: countryRows,
      paymentMethods: paymentRows,
      ratings: ratingRows,
    };
  });
}

export async function listCountriesRepo(actorId: string, activeOnly = false) {
  return withAppDb({ scope: "user_session", actorId }, async (tx) => {
    const query = tx.select().from(countries);
    if (activeOnly) {
      return query.where(eq(countries.active, true)).orderBy(asc(countries.nameFr));
    }
    return query.orderBy(desc(countries.active), asc(countries.nameFr));
  });
}

export async function listPaymentMethodsRepo(actorId: string) {
  return withAppDb({ scope: "user_session", actorId }, async (tx) =>
    tx
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.active, true))
      .orderBy(asc(paymentMethods.name)),
  );
}
