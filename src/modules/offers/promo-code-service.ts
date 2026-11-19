import "server-only";

import { eq } from "drizzle-orm";
import { logAudit } from "@/server/audit/log";
import { requirePermission } from "@/server/auth/permissions";
import type { AuthenticatedUser } from "@/server/auth/session";
import { withAppDb } from "@/server/db/context";
import { offerHighlights, offerTerms, promoCodes } from "@/server/db/schema";
import { listPromoCodesRepo } from "@/modules/offers/offer-repository";
import { offerHighlightSchema, offerTermSchema, promoCodeSchema } from "@/modules/offers/schema";

export async function listPromoCodesForAdmin(actor: AuthenticatedUser) {
  requirePermission(actor, "offers.read");
  return listPromoCodesRepo(actor.id);
}

export async function addOfferTerm(
  actor: AuthenticatedUser,
  rawInput: unknown,
  ipHash: string | null,
) {
  requirePermission(actor, "offers.write");
  const parsed = offerTermSchema.parse(rawInput);

  const created = await withAppDb({ scope: "user_session", actorId: actor.id }, async (tx) => {
    const [row] = await tx.insert(offerTerms).values(parsed).returning();
    if (!row) throw new Error("OFFER_TERM_SAVE_FAILED");
    return row;
  });

  await logAudit({
    actorId: actor.id,
    action: "offer_term.created",
    entityType: "offer_terms",
    entityId: created.id,
    beforeState: null,
    afterState: created as Record<string, unknown>,
    ipHash,
  });
  return created;
}

export async function addOfferHighlight(
  actor: AuthenticatedUser,
  rawInput: unknown,
  ipHash: string | null,
) {
  requirePermission(actor, "offers.write");
  const parsed = offerHighlightSchema.parse(rawInput);

  const created = await withAppDb({ scope: "user_session", actorId: actor.id }, async (tx) => {
    const [row] = await tx.insert(offerHighlights).values(parsed).returning();
    if (!row) throw new Error("OFFER_HIGHLIGHT_SAVE_FAILED");
    return row;
  });

  await logAudit({
    actorId: actor.id,
    action: "offer_highlight.created",
    entityType: "offer_highlights",
    entityId: created.id,
    beforeState: null,
    afterState: created as Record<string, unknown>,
    ipHash,
  });
  return created;
}

export async function upsertPromoCode(
  actor: AuthenticatedUser,
  rawInput: unknown,
  ipHash: string | null,
) {
  requirePermission(actor, "offers.write");
  const parsed = promoCodeSchema.parse(rawInput);

  const result = await withAppDb({ scope: "user_session", actorId: actor.id }, async (tx) => {
    if (parsed.id) {
      const [existing] = await tx.select().from(promoCodes).where(eq(promoCodes.id, parsed.id));
      if (!existing) throw new Error("PROMO_CODE_NOT_FOUND");
      const [updated] = await tx
        .update(promoCodes)
        .set({
          bookmakerId: parsed.bookmakerId,
          offerId: parsed.offerId,
          countryId: parsed.countryId,
          code: parsed.code,
          description: parsed.description,
          programSource: parsed.programSource,
          validFrom: parsed.validFrom,
          validUntil: parsed.validUntil,
          status: parsed.status,
          deletedAt: parsed.status === "archived" ? new Date() : null,
        })
        .where(eq(promoCodes.id, parsed.id))
        .returning();
      if (!updated) throw new Error("PROMO_CODE_UPDATE_FAILED");
      return { beforeState: existing, afterState: updated, isUpdate: true };
    }

    const [created] = await tx
      .insert(promoCodes)
      .values({
        bookmakerId: parsed.bookmakerId,
        offerId: parsed.offerId,
        countryId: parsed.countryId,
        code: parsed.code,
        description: parsed.description,
        programSource: parsed.programSource,
        validFrom: parsed.validFrom,
        validUntil: parsed.validUntil,
        status: parsed.status,
      })
      .returning();
    if (!created) throw new Error("PROMO_CODE_INSERT_FAILED");
    return { beforeState: null, afterState: created, isUpdate: false };
  });

  await logAudit({
    actorId: actor.id,
    action: result.isUpdate ? "promo_code.updated" : "promo_code.created",
    entityType: "promo_codes",
    entityId: result.afterState.id,
    beforeState: result.beforeState as Record<string, unknown> | null,
    afterState: result.afterState as Record<string, unknown>,
    ipHash,
  });

  return result.afterState;
}
