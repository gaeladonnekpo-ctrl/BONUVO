import "server-only";

import { and, eq } from "drizzle-orm";
import type { AppDbTransaction } from "@/server/db/context";
import {
  affiliateNetworks,
  commissions,
  conversions,
  postbackEvents,
  type PostbackSourceType,
} from "@/server/db/schema";
import type { getPartnerAdapter } from "./adapters";
import type { AffiliateNetworkConfig } from "./adapters/types";
import { resolveConversionAttributionTx } from "./attribution-helper";

export function toNetworkConfig(
  row: typeof affiliateNetworks.$inferSelect,
): AffiliateNetworkConfig {
  return {
    id: row.id,
    slug: row.slug ?? row.name.toLowerCase(),
    name: row.name,
    bookmakerId: row.bookmakerId,
    adapterKey: row.adapterKey,
    subIdParamName: row.subIdParamName,
    secretEnvRef: row.secretEnvRef,
    signatureMode: row.signatureMode,
    signatureHeader: row.signatureHeader,
    allowedIps: row.allowedIps,
    timestampToleranceSeconds: row.timestampToleranceSeconds,
  };
}

export async function attributeAndPersistPostbackTx(
  tx: AppDbTransaction,
  params: {
    postbackEventId: string;
    network: AffiliateNetworkConfig;
    sourceType: PostbackSourceType;
    parsed: ReturnType<ReturnType<typeof getPartnerAdapter>["toConversion"]>;
    isReplay?: boolean;
  },
): Promise<{
  outcome: "processed" | "duplicate" | "rejected";
  conversionId?: string;
  attributionMode?: string;
  reason?: string;
}> {
  if (params.parsed.externalEventId) {
    const [existing] = await tx
      .select({ id: conversions.id })
      .from(conversions)
      .where(
        and(
          eq(conversions.networkId, params.network.id),
          eq(conversions.externalEventId, params.parsed.externalEventId),
        ),
      )
      .limit(1);

    if (existing) {
      await tx
        .update(postbackEvents)
        .set({
          processingStatus: "duplicate",
          processedAt: new Date(),
          rejectionReason: "duplicate_external_event_id",
        })
        .where(eq(postbackEvents.id, params.postbackEventId));
      return { outcome: "duplicate", conversionId: existing.id };
    }
  }

  const attribution = await resolveConversionAttributionTx(tx, {
    publicClickId: params.parsed.publicClickId,
    promoCode: params.parsed.promoCode,
    fallbackBookmakerId: params.network.bookmakerId,
  });

  if (!attribution) {
    await tx
      .update(postbackEvents)
      .set({
        processingStatus: "rejected",
        rejectionReason: "unresolvable_bookmaker",
        processedAt: new Date(),
      })
      .where(eq(postbackEvents.id, params.postbackEventId));
    return { outcome: "rejected", reason: "unresolvable_bookmaker" };
  }

  const [createdConversion] = await tx
    .insert(conversions)
    .values({
      networkId: params.network.id,
      bookmakerId: attribution.bookmakerId,
      offerId: attribution.offerId,
      countryId: attribution.countryId,
      clickId: attribution.clickId,
      promoCodeId: attribution.promoCodeId,
      postbackEventId: params.postbackEventId,
      externalEventId: params.parsed.externalEventId,
      externalPlayerId: params.parsed.externalPlayerId,
      conversionType: params.parsed.conversionType,
      attributionMode: attribution.attributionMode,
      source: params.sourceType,
      status: attribution.status,
      amount: params.parsed.amount,
      currencyCode: params.parsed.currencyCode,
      occurredAt: params.parsed.occurredAt,
    })
    .returning({ id: conversions.id });

  if (createdConversion && params.parsed.commissionAmount !== null && params.parsed.currencyCode) {
    await tx.insert(commissions).values({
      conversionId: createdConversion.id,
      bookmakerId: attribution.bookmakerId,
      model: params.parsed.commissionModel,
      amount: params.parsed.commissionAmount,
      currencyCode: params.parsed.currencyCode,
      status: "pending",
      periodLabel: params.parsed.occurredAt.toISOString().slice(0, 7),
    });
  }

  await tx
    .update(postbackEvents)
    .set({
      processingStatus: params.isReplay ? "replay" : "processed",
      clickId: attribution.clickId,
      rejectionReason: "",
      processedAt: new Date(),
    })
    .where(eq(postbackEvents.id, params.postbackEventId));

  return {
    outcome: "processed",
    conversionId: createdConversion?.id,
    attributionMode: attribution.attributionMode,
  };
}
