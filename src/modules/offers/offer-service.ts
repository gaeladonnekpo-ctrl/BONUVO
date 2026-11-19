import "server-only";

import { eq } from "drizzle-orm";
import { logAudit } from "@/server/audit/log";
import { ForbiddenError, requirePermission } from "@/server/auth/permissions";
import type { AuthenticatedUser } from "@/server/auth/session";
import { withAppDb } from "@/server/db/context";
import { bookmakers, offerCountries, offers } from "@/server/db/schema";
import {
  getOfferByIdRepo,
  listOffersRepo,
  type OfferListFilter,
} from "@/modules/offers/offer-repository";
import {
  catalogDeleteSchema,
  offerInputSchema,
  offerStatusActionSchema,
} from "@/modules/offers/schema";

export {
  addOfferHighlight,
  addOfferTerm,
  listPromoCodesForAdmin,
  upsertPromoCode,
} from "@/modules/offers/promo-code-service";

export async function listOffersForAdmin(actor: AuthenticatedUser, filter?: OfferListFilter) {
  requirePermission(actor, "offers.read");
  return listOffersRepo(actor.id, filter);
}

export async function getOfferDetailForAdmin(actor: AuthenticatedUser, offerId: string) {
  requirePermission(actor, "offers.read");
  return getOfferByIdRepo(actor.id, offerId);
}

export async function saveOffer(
  actor: AuthenticatedUser,
  rawInput: unknown,
  ipHash: string | null,
) {
  requirePermission(actor, "offers.write");
  const parsed = offerInputSchema.parse(rawInput);

  const result = await withAppDb({ scope: "user_session", actorId: actor.id }, async (tx) => {
    const [bm] = await tx
      .select({ id: bookmakers.id })
      .from(bookmakers)
      .where(eq(bookmakers.id, parsed.bookmakerId));
    if (!bm) throw new Error("BOOKMAKER_NOT_FOUND");

    if (parsed.id) {
      const [existing] = await tx.select().from(offers).where(eq(offers.id, parsed.id));
      if (!existing) throw new Error("OFFER_NOT_FOUND");

      const [updated] = await tx
        .update(offers)
        .set({
          bookmakerId: parsed.bookmakerId,
          offerType: parsed.offerType,
          slug: parsed.slug,
          titleFr: parsed.titleFr,
          titleEn: parsed.titleEn,
          bonusAmount: parsed.bonusAmount,
          currencyCode: parsed.currencyCode,
          bonusPercentage: parsed.bonusPercentage,
          minDeposit: parsed.minDeposit,
          rolloverText: parsed.rolloverText,
          minOdds: parsed.minOdds,
          validFrom: parsed.validFrom,
          validUntil: parsed.validUntil,
          badgeCode: parsed.badgeCode,
          badgeJustification: parsed.badgeCode ? parsed.badgeJustification : "",
          rankOrder: parsed.rankOrder,
        })
        .where(eq(offers.id, parsed.id))
        .returning();
      if (!updated) throw new Error("OFFER_UPDATE_FAILED");

      await tx.delete(offerCountries).where(eq(offerCountries.offerId, updated.id));
      await tx
        .insert(offerCountries)
        .values(parsed.countryIds.map((countryId) => ({ offerId: updated.id, countryId })));

      return { isUpdate: true, beforeState: existing, afterState: updated };
    }

    const [created] = await tx
      .insert(offers)
      .values({
        bookmakerId: parsed.bookmakerId,
        offerType: parsed.offerType,
        slug: parsed.slug,
        titleFr: parsed.titleFr,
        titleEn: parsed.titleEn,
        bonusAmount: parsed.bonusAmount,
        currencyCode: parsed.currencyCode,
        bonusPercentage: parsed.bonusPercentage,
        minDeposit: parsed.minDeposit,
        rolloverText: parsed.rolloverText,
        minOdds: parsed.minOdds,
        validFrom: parsed.validFrom,
        validUntil: parsed.validUntil,
        badgeCode: parsed.badgeCode,
        badgeJustification: parsed.badgeCode ? parsed.badgeJustification : "",
        rankOrder: parsed.rankOrder,
        status: "draft",
      })
      .returning();
    if (!created) throw new Error("OFFER_INSERT_FAILED");

    await tx
      .insert(offerCountries)
      .values(parsed.countryIds.map((countryId) => ({ offerId: created.id, countryId })));

    return { isUpdate: false, beforeState: null, afterState: created };
  });

  await logAudit({
    actorId: actor.id,
    action: result.isUpdate ? "offer.updated" : "offer.created",
    entityType: "offers",
    entityId: result.afterState.id,
    beforeState: result.beforeState as Record<string, unknown> | null,
    afterState: {
      ...(result.afterState as Record<string, unknown>),
      countryIds: parsed.countryIds,
    },
    ipHash,
  });

  return result.afterState;
}

export async function transitionOfferStatus(
  actor: AuthenticatedUser,
  rawInput: unknown,
  ipHash: string | null,
) {
  const parsed = offerStatusActionSchema.parse(rawInput);
  if (parsed.nextStatus === "published") {
    requirePermission(actor, "offers.publish");
  } else {
    requirePermission(actor, "offers.write");
  }

  const result = await withAppDb({ scope: "user_session", actorId: actor.id }, async (tx) => {
    const [existing] = await tx.select().from(offers).where(eq(offers.id, parsed.offerId));
    if (!existing) throw new Error("OFFER_NOT_FOUND");

    const [updated] = await tx
      .update(offers)
      .set({
        status: parsed.nextStatus,
        deletedAt: parsed.nextStatus === "archived" ? new Date() : null,
      })
      .where(eq(offers.id, parsed.offerId))
      .returning();
    if (!updated) throw new Error("OFFER_STATUS_FAILED");

    return { beforeState: existing, afterState: updated };
  });

  await logAudit({
    actorId: actor.id,
    action: `offer.status_${parsed.nextStatus}`,
    entityType: "offers",
    entityId: parsed.offerId,
    beforeState: result.beforeState as Record<string, unknown>,
    afterState: result.afterState as Record<string, unknown>,
    ipHash,
  });

  return result.afterState;
}

export async function markOfferVerified(
  actor: AuthenticatedUser,
  offerId: string,
  ipHash: string | null,
) {
  requirePermission(actor, "offers.write");
  const now = new Date();

  const result = await withAppDb({ scope: "user_session", actorId: actor.id }, async (tx) => {
    const [existing] = await tx.select().from(offers).where(eq(offers.id, offerId));
    if (!existing) throw new Error("OFFER_NOT_FOUND");

    const [updated] = await tx
      .update(offers)
      .set({ lastVerifiedAt: now, verifiedBy: actor.id })
      .where(eq(offers.id, offerId))
      .returning();
    if (!updated) throw new Error("OFFER_VERIFY_FAILED");

    return { beforeState: existing, afterState: updated };
  });

  await logAudit({
    actorId: actor.id,
    action: "offer.verified",
    entityType: "offers",
    entityId: offerId,
    beforeState: {
      lastVerifiedAt: result.beforeState.lastVerifiedAt,
      verifiedBy: result.beforeState.verifiedBy,
    },
    afterState: { lastVerifiedAt: result.afterState.lastVerifiedAt, verifiedBy: actor.id },
    ipHash,
  });

  return result.afterState;
}

export async function deleteOfferHard(
  actor: AuthenticatedUser,
  rawInput: unknown,
  ipHash: string | null,
) {
  requirePermission(actor, "offers.publish");
  if (!actor.roles.includes("admin") && !actor.roles.includes("super_admin")) {
    throw new ForbiddenError(
      "La suppression définitive d'une offre est réservée à l'administrateur.",
    );
  }

  const parsed = catalogDeleteSchema.parse(rawInput);
  const deleted = await withAppDb({ scope: "user_session", actorId: actor.id }, async (tx) => {
    const [existing] = await tx.select().from(offers).where(eq(offers.id, parsed.entityId));
    if (!existing) throw new Error("OFFER_NOT_FOUND");

    if (
      parsed.confirmationName.toLowerCase() !== existing.titleFr.trim().toLowerCase() &&
      parsed.confirmationName.toLowerCase() !== existing.slug.trim().toLowerCase()
    ) {
      throw new Error("CONFIRMATION_MISMATCH");
    }

    await tx.delete(offers).where(eq(offers.id, parsed.entityId));
    return existing;
  });

  await logAudit({
    actorId: actor.id,
    action: "offer.deleted",
    entityType: "offers",
    entityId: parsed.entityId,
    beforeState: deleted as Record<string, unknown>,
    afterState: null,
    ipHash,
  });

  return deleted;
}
