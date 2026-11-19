import "server-only";

import { eq } from "drizzle-orm";
import { logAudit } from "@/server/audit/log";
import { requirePermission } from "@/server/auth/permissions";
import type { AuthenticatedUser } from "@/server/auth/session";
import { withAppDb } from "@/server/db/context";
import {
  bookmakerCountries,
  bookmakerPaymentMethods,
  bookmakerRatings,
  bookmakers,
} from "@/server/db/schema";
import {
  getBookmakerByIdRepo,
  listBookmakersRepo,
  type BookmakerListFilter,
} from "@/modules/offers/bookmaker-repository";
import {
  bookmakerCountrySchema,
  bookmakerInputSchema,
  bookmakerPaymentMethodSchema,
  bookmakerRatingSchema,
} from "@/modules/offers/schema";

export {
  bulkUpdateCountriesActive,
  listCountriesForAdmin,
  listPaymentMethodsForAdmin,
  updateCountryConfig,
} from "@/modules/offers/country-service";

export function computeBookmakerFinalScore(scores: {
  bonusScore: number;
  paymentsScore: number;
  oddsScore: number;
  appScore: number;
  supportScore: number;
}): string {
  const avg =
    (scores.bonusScore +
      scores.paymentsScore +
      scores.oddsScore +
      scores.appScore +
      scores.supportScore) /
    5;
  return avg.toFixed(2);
}

export async function listBookmakersForAdmin(
  actor: AuthenticatedUser,
  filter?: BookmakerListFilter,
) {
  requirePermission(actor, "offers.read");
  return listBookmakersRepo(actor.id, filter);
}

export async function getBookmakerDetailForAdmin(actor: AuthenticatedUser, bookmakerId: string) {
  requirePermission(actor, "offers.read");
  return getBookmakerByIdRepo(actor.id, bookmakerId);
}

export async function saveBookmaker(
  actor: AuthenticatedUser,
  rawInput: unknown,
  ipHash: string | null,
) {
  requirePermission(actor, "offers.write");
  const parsed = bookmakerInputSchema.parse(rawInput);

  const result = await withAppDb({ scope: "user_session", actorId: actor.id }, async (tx) => {
    if (parsed.id) {
      const [existing] = await tx.select().from(bookmakers).where(eq(bookmakers.id, parsed.id));
      if (!existing) throw new Error("BOOKMAKER_NOT_FOUND");
      const [updated] = await tx
        .update(bookmakers)
        .set({
          name: parsed.name,
          slug: parsed.slug,
          logoAssetId: parsed.logoAssetId,
          descriptionFr: parsed.descriptionFr,
          descriptionEn: parsed.descriptionEn,
          foundedYear: parsed.foundedYear,
          appPlatforms: parsed.appPlatforms,
          allowedHosts: parsed.allowedHosts,
          operatorLicenseNumber: parsed.operatorLicenseNumber,
          operatorLicenseAuthority: parsed.operatorLicenseAuthority,
          status: parsed.status,
          deletedAt: parsed.status === "archived" ? new Date() : null,
        })
        .where(eq(bookmakers.id, parsed.id))
        .returning();
      if (!updated) throw new Error("BOOKMAKER_UPDATE_FAILED");
      return { isUpdate: true, beforeState: existing, afterState: updated };
    }

    const [created] = await tx
      .insert(bookmakers)
      .values({
        name: parsed.name,
        slug: parsed.slug,
        logoAssetId: parsed.logoAssetId,
        descriptionFr: parsed.descriptionFr,
        descriptionEn: parsed.descriptionEn,
        foundedYear: parsed.foundedYear,
        appPlatforms: parsed.appPlatforms,
        allowedHosts: parsed.allowedHosts,
        operatorLicenseNumber: parsed.operatorLicenseNumber,
        operatorLicenseAuthority: parsed.operatorLicenseAuthority,
        status: parsed.status,
      })
      .returning();
    if (!created) throw new Error("BOOKMAKER_INSERT_FAILED");
    return { isUpdate: false, beforeState: null, afterState: created };
  });

  await logAudit({
    actorId: actor.id,
    action: result.isUpdate ? "bookmaker.updated" : "bookmaker.created",
    entityType: "bookmakers",
    entityId: result.afterState.id,
    beforeState: result.beforeState as Record<string, unknown> | null,
    afterState: result.afterState as Record<string, unknown>,
    ipHash,
  });

  return result.afterState;
}

export async function archiveBookmaker(
  actor: AuthenticatedUser,
  bookmakerId: string,
  ipHash: string | null,
) {
  requirePermission(actor, "offers.write");
  const result = await withAppDb({ scope: "user_session", actorId: actor.id }, async (tx) => {
    const [existing] = await tx.select().from(bookmakers).where(eq(bookmakers.id, bookmakerId));
    if (!existing) throw new Error("BOOKMAKER_NOT_FOUND");

    const [updated] = await tx
      .update(bookmakers)
      .set({ status: "archived", deletedAt: new Date() })
      .where(eq(bookmakers.id, bookmakerId))
      .returning();
    if (!updated) throw new Error("BOOKMAKER_ARCHIVE_FAILED");

    return { beforeState: existing, afterState: updated };
  });

  await logAudit({
    actorId: actor.id,
    action: "bookmaker.archived",
    entityType: "bookmakers",
    entityId: bookmakerId,
    beforeState: result.beforeState as Record<string, unknown>,
    afterState: result.afterState as Record<string, unknown>,
    ipHash,
  });

  return result.afterState;
}

export async function upsertBookmakerCountry(
  actor: AuthenticatedUser,
  rawInput: unknown,
  ipHash: string | null,
) {
  requirePermission(actor, "offers.write");
  const parsed = bookmakerCountrySchema.parse(rawInput);

  const saved = await withAppDb({ scope: "user_session", actorId: actor.id }, async (tx) => {
    const [row] = await tx
      .insert(bookmakerCountries)
      .values({
        bookmakerId: parsed.bookmakerId,
        countryId: parsed.countryId,
        eligible: parsed.eligible,
        localLicense: parsed.localLicense,
        authorityName: parsed.authorityName,
        countryScore: parsed.countryScore,
        notes: parsed.notes,
      })
      .onConflictDoUpdate({
        target: [bookmakerCountries.bookmakerId, bookmakerCountries.countryId],
        set: {
          eligible: parsed.eligible,
          localLicense: parsed.localLicense,
          authorityName: parsed.authorityName,
          countryScore: parsed.countryScore,
          notes: parsed.notes,
          deletedAt: null,
          status: "active",
        },
      })
      .returning();
    if (!row) throw new Error("BOOKMAKER_COUNTRY_SAVE_FAILED");
    return row;
  });

  await logAudit({
    actorId: actor.id,
    action: "bookmaker_country.upserted",
    entityType: "bookmaker_countries",
    entityId: saved.id,
    beforeState: null,
    afterState: saved as Record<string, unknown>,
    ipHash,
  });
  return saved;
}

export async function upsertBookmakerPaymentMethod(
  actor: AuthenticatedUser,
  rawInput: unknown,
  ipHash: string | null,
) {
  requirePermission(actor, "offers.write");
  const parsed = bookmakerPaymentMethodSchema.parse(rawInput);

  const saved = await withAppDb({ scope: "user_session", actorId: actor.id }, async (tx) => {
    const [row] = await tx
      .insert(bookmakerPaymentMethods)
      .values({
        bookmakerId: parsed.bookmakerId,
        paymentMethodId: parsed.paymentMethodId,
        countryId: parsed.countryId,
        minDepositAmount: parsed.minDepositAmount,
        currencyCode: parsed.currencyCode,
        supportsDeposit: parsed.supportsDeposit,
        supportsWithdrawal: parsed.supportsWithdrawal,
      })
      .onConflictDoUpdate({
        target: [
          bookmakerPaymentMethods.bookmakerId,
          bookmakerPaymentMethods.paymentMethodId,
          bookmakerPaymentMethods.countryId,
        ],
        set: {
          minDepositAmount: parsed.minDepositAmount,
          currencyCode: parsed.currencyCode,
          supportsDeposit: parsed.supportsDeposit,
          supportsWithdrawal: parsed.supportsWithdrawal,
        },
      })
      .returning();
    if (!row) throw new Error("BOOKMAKER_PAYMENT_SAVE_FAILED");
    return row;
  });

  await logAudit({
    actorId: actor.id,
    action: "bookmaker_payment_method.upserted",
    entityType: "bookmaker_payment_methods",
    entityId: saved.id,
    beforeState: null,
    afterState: saved as Record<string, unknown>,
    ipHash,
  });
  return saved;
}

export async function addBookmakerRating(
  actor: AuthenticatedUser,
  rawInput: unknown,
  ipHash: string | null,
) {
  requirePermission(actor, "offers.write");
  const parsed = bookmakerRatingSchema.parse(rawInput);
  const finalScore = computeBookmakerFinalScore(parsed);

  const created = await withAppDb({ scope: "user_session", actorId: actor.id }, async (tx) => {
    const [row] = await tx
      .insert(bookmakerRatings)
      .values({
        bookmakerId: parsed.bookmakerId,
        gridVersion: parsed.gridVersion,
        bonusScore: parsed.bonusScore.toFixed(2),
        paymentsScore: parsed.paymentsScore.toFixed(2),
        oddsScore: parsed.oddsScore.toFixed(2),
        appScore: parsed.appScore.toFixed(2),
        supportScore: parsed.supportScore.toFixed(2),
        finalScore,
        scoredBy: actor.id,
        notes: parsed.notes,
      })
      .returning();
    if (!row) throw new Error("BOOKMAKER_RATING_SAVE_FAILED");
    return row;
  });

  await logAudit({
    actorId: actor.id,
    action: "bookmaker_rating.created",
    entityType: "bookmaker_ratings",
    entityId: created.id,
    beforeState: null,
    afterState: created as Record<string, unknown>,
    ipHash,
  });
  return created;
}
