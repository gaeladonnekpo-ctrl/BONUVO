import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import type { AppDbTransaction } from "@/server/db/context";
import {
  clicks,
  promoCodes,
  type AttributionMode,
  type ConversionStatus,
} from "@/server/db/schema";

export interface ResolvedAttribution {
  readonly clickId: string | null;
  readonly bookmakerId: string;
  readonly offerId: string | null;
  readonly countryId: string | null;
  readonly promoCodeId: string | null;
  readonly attributionMode: AttributionMode;
  readonly status: ConversionStatus;
}

export async function resolveConversionAttributionTx(
  tx: AppDbTransaction,
  params: {
    publicClickId: string | null;
    promoCode: string | null;
    fallbackBookmakerId: string | null;
  },
): Promise<ResolvedAttribution | null> {
  if (params.publicClickId) {
    const [clickRow] = await tx
      .select({
        id: clicks.id,
        bookmakerId: clicks.bookmakerId,
        offerId: clicks.offerId,
        countryId: clicks.countryId,
      })
      .from(clicks)
      .where(eq(clicks.publicClickId, params.publicClickId));

    if (clickRow) {
      return {
        clickId: clickRow.id,
        bookmakerId: clickRow.bookmakerId,
        offerId: clickRow.offerId,
        countryId: clickRow.countryId,
        promoCodeId: null,
        attributionMode: "click_id",
        status: "recorded",
      };
    }
  }

  if (params.promoCode) {
    const normalizedCode = params.promoCode.trim().toUpperCase();
    const promoConditions = [
      eq(promoCodes.code, normalizedCode),
      eq(promoCodes.status, "active"),
      isNull(promoCodes.deletedAt),
    ];
    if (params.fallbackBookmakerId) {
      promoConditions.push(eq(promoCodes.bookmakerId, params.fallbackBookmakerId));
    }

    const [promoRow] = await tx
      .select({
        id: promoCodes.id,
        bookmakerId: promoCodes.bookmakerId,
        offerId: promoCodes.offerId,
        countryId: promoCodes.countryId,
      })
      .from(promoCodes)
      .where(and(...promoConditions))
      .limit(1);

    if (promoRow) {
      return {
        clickId: null,
        bookmakerId: promoRow.bookmakerId,
        offerId: promoRow.offerId,
        countryId: promoRow.countryId,
        promoCodeId: promoRow.id,
        attributionMode: "promo_code",
        status: "recorded",
      };
    }
  }

  if (params.fallbackBookmakerId) {
    return {
      clickId: null,
      bookmakerId: params.fallbackBookmakerId,
      offerId: null,
      countryId: null,
      promoCodeId: null,
      attributionMode: "unattributed",
      status: "unattributed",
    };
  }

  return null;
}
