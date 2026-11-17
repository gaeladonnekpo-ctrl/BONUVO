import "server-only";

import { and, gte, isNotNull, lte, sql } from "drizzle-orm";
import type { AppDbTransaction } from "@/server/db/context";
import { clicks, commissions, conversions, countries, visitEvents } from "@/server/db/schema";
import type {
  RawClickFact,
  RawCommissionFact,
  RawConversionFact,
  RawVisitFact,
} from "@/modules/intelligence/metrics-math";

function toUtcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function loadRawFactsForRangeTx(
  tx: AppDbTransaction,
  startBound: Date,
  endBound: Date,
): Promise<{
  visits: RawVisitFact[];
  clicks: RawClickFact[];
  conversions: RawConversionFact[];
  commissions: RawCommissionFact[];
}> {
  const [countryRows, rawVisitRows, rawClickRows, rawConversionRows, rawCommissionRows] =
    await Promise.all([
      tx.select({ id: countries.id, code: countries.code }).from(countries),
      tx
        .select({
          createdAt: visitEvents.createdAt,
          countryCode: visitEvents.countryCode,
          bookmakerId: visitEvents.bookmakerId,
          offerId: visitEvents.offerId,
          eventType: visitEvents.eventType,
          visitorDailyHash: visitEvents.visitorDailyHash,
          isBot: visitEvents.isBot,
        })
        .from(visitEvents)
        .where(and(gte(visitEvents.createdAt, startBound), lte(visitEvents.createdAt, endBound))),
      tx
        .select({
          id: clicks.id,
          createdAt: clicks.createdAt,
          countryCode: clicks.countryCode,
          bookmakerId: clicks.bookmakerId,
          offerId: clicks.offerId,
          campaignId: clicks.campaignId,
          isBot: clicks.isBot,
          isSuspect: clicks.isSuspect,
        })
        .from(clicks)
        .where(and(gte(clicks.createdAt, startBound), lte(clicks.createdAt, endBound))),
      tx
        .select({
          id: conversions.id,
          occurredAt: conversions.occurredAt,
          bookmakerId: conversions.bookmakerId,
          offerId: conversions.offerId,
          countryId: conversions.countryId,
          clickId: conversions.clickId,
          conversionType: conversions.conversionType,
          status: conversions.status,
        })
        .from(conversions)
        .where(and(gte(conversions.occurredAt, startBound), lte(conversions.occurredAt, endBound))),
      tx
        .select({
          createdAt: commissions.createdAt,
          conversionId: commissions.conversionId,
          bookmakerId: commissions.bookmakerId,
          status: commissions.status,
          amount: commissions.amount,
          currencyCode: commissions.currencyCode,
        })
        .from(commissions)
        .where(and(gte(commissions.createdAt, startBound), lte(commissions.createdAt, endBound))),
    ]);

  const countryCodeById = new Map(countryRows.map((c) => [c.id, c.code]));
  const linkedClickIds = Array.from(
    new Set(rawConversionRows.map((c) => c.clickId).filter(Boolean) as string[]),
  );
  const linkedConvIds = Array.from(
    new Set(rawCommissionRows.map((c) => c.conversionId).filter(Boolean) as string[]),
  );

  const clickLookup = new Map<string, { countryCode: string; campaignId: string | null }>();
  if (linkedClickIds.length > 0) {
    const extraClicks = await tx
      .select({ id: clicks.id, countryCode: clicks.countryCode, campaignId: clicks.campaignId })
      .from(clicks)
      .where(sql`${clicks.id} = ANY(${linkedClickIds})`);
    for (const row of extraClicks) {
      clickLookup.set(row.id, { countryCode: row.countryCode, campaignId: row.campaignId });
    }
  }

  const convLookup = new Map<
    string,
    { countryCode: string; offerId: string | null; campaignId: string | null }
  >();
  if (linkedConvIds.length > 0) {
    const extraConvs = await tx
      .select({
        id: conversions.id,
        countryId: conversions.countryId,
        offerId: conversions.offerId,
        clickId: conversions.clickId,
      })
      .from(conversions)
      .where(and(sql`${conversions.id} = ANY(${linkedConvIds})`, isNotNull(conversions.id)));

    const extraConvClickIds = Array.from(
      new Set(extraConvs.map((c) => c.clickId).filter(Boolean) as string[]),
    );
    if (extraConvClickIds.length > 0) {
      const cRows = await tx
        .select({ id: clicks.id, countryCode: clicks.countryCode, campaignId: clicks.campaignId })
        .from(clicks)
        .where(sql`${clicks.id} = ANY(${extraConvClickIds})`);
      for (const c of cRows) {
        clickLookup.set(c.id, { countryCode: c.countryCode, campaignId: c.campaignId });
      }
    }

    for (const cv of extraConvs) {
      const clickMeta = cv.clickId ? clickLookup.get(cv.clickId) : undefined;
      const countryCode =
        (cv.countryId ? countryCodeById.get(cv.countryId) : undefined) ??
        clickMeta?.countryCode ??
        "GLOBAL";
      convLookup.set(cv.id, {
        countryCode,
        offerId: cv.offerId,
        campaignId: clickMeta?.campaignId ?? null,
      });
    }
  }

  return {
    visits: rawVisitRows.map((v) => ({
      metricDate: toUtcDateString(v.createdAt),
      countryCode: v.countryCode,
      bookmakerId: v.bookmakerId,
      offerId: v.offerId,
      eventType: v.eventType,
      visitorDailyHash: v.visitorDailyHash,
      isBot: v.isBot,
    })),
    clicks: rawClickRows.map((c) => ({
      metricDate: toUtcDateString(c.createdAt),
      countryCode: c.countryCode,
      bookmakerId: c.bookmakerId,
      offerId: c.offerId,
      campaignId: c.campaignId,
      isBot: c.isBot,
      isSuspect: c.isSuspect,
    })),
    conversions: rawConversionRows.map((cv) => {
      const clickMeta = cv.clickId ? clickLookup.get(cv.clickId) : undefined;
      const countryCode =
        (cv.countryId ? countryCodeById.get(cv.countryId) : undefined) ??
        clickMeta?.countryCode ??
        "GLOBAL";
      return {
        metricDate: toUtcDateString(cv.occurredAt),
        countryCode,
        bookmakerId: cv.bookmakerId,
        offerId: cv.offerId,
        campaignId: clickMeta?.campaignId ?? null,
        conversionType: cv.conversionType,
        status: cv.status,
      };
    }),
    commissions: rawCommissionRows.map((cm) => {
      const cvMeta = cm.conversionId ? convLookup.get(cm.conversionId) : undefined;
      return {
        metricDate: toUtcDateString(cm.createdAt),
        countryCode: cvMeta?.countryCode ?? "GLOBAL",
        bookmakerId: cm.bookmakerId,
        offerId: cvMeta?.offerId ?? null,
        campaignId: cvMeta?.campaignId ?? null,
        status: cm.status,
        amount: Number(cm.amount),
        currencyCode: cm.currencyCode,
      };
    }),
  };
}
