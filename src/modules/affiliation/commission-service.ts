import "server-only";

import { desc, eq, isNull } from "drizzle-orm";
import { logAudit } from "@/server/audit/log";
import { can, requirePermission } from "@/server/auth/permissions";
import type { AuthenticatedUser } from "@/server/auth/session";
import { withAppDb } from "@/server/db/context";
import {
  affiliateNetworks,
  bookmakers,
  campaigns,
  clicks,
  commissionHistory,
  commissions,
  conversionImports,
  conversions,
  postbackEvents,
} from "@/server/db/schema";
import { commissionStatusUpdateSchema } from "./phase5-schema";

export async function setCommissionStatus(
  actor: AuthenticatedUser,
  rawInput: unknown,
  ipHash: string | null,
) {
  requirePermission(actor, "conversions.manage");
  const parsed = commissionStatusUpdateSchema.parse(rawInput);

  const result = await withAppDb({ scope: "user_session", actorId: actor.id }, async (tx) => {
    const [existing] = await tx
      .select()
      .from(commissions)
      .where(eq(commissions.id, parsed.commissionId));
    if (!existing) throw new Error("COMMISSION_NOT_FOUND");

    const nextProof = parsed.proofReference.trim() || existing.proofReference;
    const [updated] = await tx
      .update(commissions)
      .set({
        status: parsed.nextStatus,
        proofReference: nextProof,
        notes: parsed.reason.trim() || existing.notes,
        updatedBy: actor.id,
      })
      .where(eq(commissions.id, existing.id))
      .returning();

    if (!updated) throw new Error("COMMISSION_UPDATE_FAILED");

    await tx.insert(commissionHistory).values({
      commissionId: existing.id,
      previousStatus: existing.status,
      nextStatus: parsed.nextStatus,
      reason: parsed.reason.trim(),
      proofReference: nextProof,
      changedBy: actor.id,
    });

    return { beforeState: existing, afterState: updated };
  });

  await logAudit({
    actorId: actor.id,
    action: "commission.status_changed",
    entityType: "commissions",
    entityId: parsed.commissionId,
    beforeState: {
      status: result.beforeState.status,
      proofReference: result.beforeState.proofReference,
    },
    afterState: {
      status: result.afterState.status,
      proofReference: result.afterState.proofReference,
      reason: parsed.reason,
    },
    ipHash,
  });

  return result.afterState;
}

export async function listPhase5AdminWorkspace(actor: AuthenticatedUser) {
  if (
    !can(actor, "offers.read") &&
    !can(actor, "stats.read") &&
    !can(actor, "conversions.manage")
  ) {
    requirePermission(actor, "conversions.manage");
  }

  return withAppDb({ scope: "user_session", actorId: actor.id }, async (tx) => {
    const [
      networkRows,
      bmRows,
      campaignRows,
      recentClicks,
      postbackRows,
      conversionRows,
      commissionRows,
      historyRows,
      importRows,
    ] = await Promise.all([
      tx.select().from(affiliateNetworks).where(isNull(affiliateNetworks.deletedAt)),
      tx
        .select({ id: bookmakers.id, name: bookmakers.name, slug: bookmakers.slug })
        .from(bookmakers)
        .where(isNull(bookmakers.deletedAt)),
      tx
        .select()
        .from(campaigns)
        .where(isNull(campaigns.deletedAt))
        .orderBy(desc(campaigns.createdAt))
        .limit(50),
      tx
        .select({
          id: clicks.id,
          publicClickId: clicks.publicClickId,
          bookmakerName: bookmakers.name,
          countryCode: clicks.countryCode,
          campaignCode: clicks.campaignCode,
          isBot: clicks.isBot,
          isSuspect: clicks.isSuspect,
          createdAt: clicks.createdAt,
        })
        .from(clicks)
        .innerJoin(bookmakers, eq(bookmakers.id, clicks.bookmakerId))
        .orderBy(desc(clicks.createdAt))
        .limit(50),
      tx.select().from(postbackEvents).orderBy(desc(postbackEvents.createdAt)).limit(50),
      tx
        .select({
          conversion: conversions,
          bookmakerName: bookmakers.name,
          publicClickId: clicks.publicClickId,
        })
        .from(conversions)
        .innerJoin(bookmakers, eq(bookmakers.id, conversions.bookmakerId))
        .leftJoin(clicks, eq(clicks.id, conversions.clickId))
        .orderBy(desc(conversions.occurredAt))
        .limit(50),
      tx
        .select({
          commission: commissions,
          bookmakerName: bookmakers.name,
        })
        .from(commissions)
        .innerJoin(bookmakers, eq(bookmakers.id, commissions.bookmakerId))
        .orderBy(desc(commissions.createdAt))
        .limit(50),
      tx.select().from(commissionHistory).orderBy(desc(commissionHistory.createdAt)).limit(50),
      tx.select().from(conversionImports).orderBy(desc(conversionImports.createdAt)).limit(30),
    ]);

    return {
      networks: networkRows,
      bookmakers: bmRows,
      campaigns: campaignRows,
      recentClicks,
      postbacks: postbackRows,
      conversions: conversionRows.map((r) => ({
        ...r.conversion,
        bookmakerName: r.bookmakerName,
        publicClickId: r.publicClickId,
      })),
      commissions: commissionRows.map((r) => ({
        ...r.commission,
        bookmakerName: r.bookmakerName,
      })),
      commissionHistory: historyRows,
      imports: importRows,
    };
  });
}
