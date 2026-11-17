import "server-only";

import { eq } from "drizzle-orm";
import { logAudit } from "@/server/audit/log";
import { requirePermission } from "@/server/auth/permissions";
import type { AuthenticatedUser } from "@/server/auth/session";
import { withAppDb } from "@/server/db/context";
import { campaigns } from "@/server/db/schema";
import { campaignUpsertSchema } from "./phase5-schema";

export async function upsertCampaign(
  actor: AuthenticatedUser,
  rawInput: unknown,
  ipHash: string | null,
) {
  requirePermission(actor, "links.manage");
  const parsed = campaignUpsertSchema.parse(rawInput);

  const result = await withAppDb({ scope: "user_session", actorId: actor.id }, async (tx) => {
    if (parsed.id) {
      const [existing] = await tx.select().from(campaigns).where(eq(campaigns.id, parsed.id));
      if (!existing) throw new Error("CAMPAIGN_NOT_FOUND");

      const [updated] = await tx
        .update(campaigns)
        .set({
          code: parsed.code,
          name: parsed.name,
          source: parsed.source,
          medium: parsed.medium,
          bookmakerId: parsed.bookmakerId,
          offerId: parsed.offerId,
          countryId: parsed.countryId,
          description: parsed.description,
          startsAt: parsed.startsAt,
          endsAt: parsed.endsAt,
          status: parsed.status,
        })
        .where(eq(campaigns.id, parsed.id))
        .returning();

      if (!updated) throw new Error("CAMPAIGN_UPDATE_FAILED");
      return { beforeState: existing, afterState: updated, isUpdate: true };
    }

    const [created] = await tx
      .insert(campaigns)
      .values({
        code: parsed.code,
        name: parsed.name,
        source: parsed.source,
        medium: parsed.medium,
        bookmakerId: parsed.bookmakerId,
        offerId: parsed.offerId,
        countryId: parsed.countryId,
        description: parsed.description,
        startsAt: parsed.startsAt,
        endsAt: parsed.endsAt,
        status: parsed.status,
      })
      .returning();

    if (!created) throw new Error("CAMPAIGN_CREATE_FAILED");
    return { beforeState: null, afterState: created, isUpdate: false };
  });

  await logAudit({
    actorId: actor.id,
    action: result.isUpdate ? "campaign.updated" : "campaign.created",
    entityType: "campaigns",
    entityId: result.afterState.id,
    beforeState: result.beforeState as Record<string, unknown> | null,
    afterState: result.afterState as Record<string, unknown>,
    ipHash,
  });

  return result.afterState;
}
