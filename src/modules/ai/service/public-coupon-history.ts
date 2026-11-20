import { desc, eq, inArray } from "drizzle-orm";
import {
  computeCouponTrackRecordSummary,
  evaluateCouponLegFromFixture,
  type CouponTrackRecordSummary,
  type LegVerdict,
} from "@/modules/ai/model/coupon-settlement";
import { PUBLIC_CATALOG_CACHE_TAGS, withCatalogCache } from "@/server/cache/catalog-tags";
import { withAppDb } from "@/server/db/context";
import {
  coupons,
  fixtures,
  predictionResults,
  type CouponSettlementStatus,
  type CouponSource,
} from "@/server/db/schema";

export interface PublicCouponLegDetail {
  fixtureId: string;
  predictionId?: string;
  matchLabel: string;
  leagueName: string;
  marketLabel: string;
  selectionLabel: string;
  probabilityPct: number;
  fairOdds?: number;
  fixtureStatus: string;
  homeGoals: number | null;
  awayGoals: number | null;
  kickoffAt: string | null;
  verdict: LegVerdict;
}

export interface PublicCouponTrackItem {
  id: string;
  titleFr: string;
  titleEn: string;
  descriptionFr: string;
  descriptionEn: string;
  source: CouponSource;
  couponCode: string;
  combinedOdds: number | null;
  confidenceLabel: string;
  settlementStatus: CouponSettlementStatus;
  validatedAt: string | null;
  settledAt: string | null;
  createdAt: string;
  legs: PublicCouponLegDetail[];
}

export interface PublicCouponTrackRecord {
  summary: CouponTrackRecordSummary;
  coupons: PublicCouponTrackItem[];
}

async function queryPublicCouponTrackRecordUncached(): Promise<PublicCouponTrackRecord> {
  return withAppDb({ scope: "public_catalog" }, async (db) => {
    const couponRows = await db
      .select()
      .from(coupons)
      .where(eq(coupons.status, "validated"))
      .orderBy(desc(coupons.settledAt), desc(coupons.validatedAt), desc(coupons.createdAt))
      .limit(40);

    if (couponRows.length === 0) {
      return {
        summary: computeCouponTrackRecordSummary([]),
        coupons: [],
      };
    }

    const fixtureIds = Array.from(
      new Set(
        couponRows.flatMap((c) =>
          Array.isArray(c.legsJson) ? c.legsJson.map((l) => l.fixtureId).filter(Boolean) : [],
        ),
      ),
    );
    const predictionIds = Array.from(
      new Set([
        ...couponRows.flatMap((c) => c.predictionIds ?? []),
        ...couponRows.flatMap((c) =>
          Array.isArray(c.legsJson)
            ? c.legsJson.map((l) => l.predictionId).filter((id): id is string => Boolean(id))
            : [],
        ),
      ]),
    );

    const [fixtureRows, resultRows] = await Promise.all([
      fixtureIds.length > 0
        ? db
            .select({
              id: fixtures.id,
              fixtureStatus: fixtures.fixtureStatus,
              homeGoals: fixtures.homeGoals,
              awayGoals: fixtures.awayGoals,
              kickoffAt: fixtures.kickoffAt,
            })
            .from(fixtures)
            .where(inArray(fixtures.id, fixtureIds))
        : Promise.resolve([]),
      predictionIds.length > 0
        ? db
            .select({
              predictionId: predictionResults.predictionId,
              verdict: predictionResults.verdict,
            })
            .from(predictionResults)
            .where(inArray(predictionResults.predictionId, predictionIds))
        : Promise.resolve([]),
    ]);

    const fixtureById = new Map(fixtureRows.map((f) => [f.id, f]));
    const verdictByPredictionId = new Map(resultRows.map((r) => [r.predictionId, r.verdict]));

    const items: PublicCouponTrackItem[] = couponRows.map((c) => {
      const rawLegs = Array.isArray(c.legsJson) ? c.legsJson : [];
      const legs: PublicCouponLegDetail[] = rawLegs.map((leg) => {
        const fix = fixtureById.get(leg.fixtureId);
        const storedVerdict = leg.predictionId
          ? (verdictByPredictionId.get(leg.predictionId) ?? null)
          : null;
        const verdict =
          leg.market === "double_chance"
            ? fix
              ? evaluateCouponLegFromFixture({
                  fixtureStatus: fix.fixtureStatus,
                  homeGoals: fix.homeGoals,
                  awayGoals: fix.awayGoals,
                  market: leg.market,
                  pickedSelection: leg.pickedSelection,
                })
              : null
            : evaluateCouponLegFromFixture({
                fixtureStatus: fix?.fixtureStatus ?? "scheduled",
                homeGoals: fix?.homeGoals ?? null,
                awayGoals: fix?.awayGoals ?? null,
                market: leg.market,
                pickedSelection: leg.pickedSelection,
                storedVerdict,
              });

        return {
          fixtureId: leg.fixtureId,
          predictionId: leg.predictionId,
          matchLabel: leg.matchLabel,
          leagueName: leg.leagueName,
          marketLabel: leg.marketLabel,
          selectionLabel: leg.selectionLabel,
          probabilityPct: leg.probabilityPct,
          fairOdds: leg.fairOdds,
          fixtureStatus: fix?.fixtureStatus ?? "scheduled",
          homeGoals: fix?.homeGoals ?? null,
          awayGoals: fix?.awayGoals ?? null,
          kickoffAt: fix?.kickoffAt ? fix.kickoffAt.toISOString() : (leg.kickoffAt ?? null),
          verdict,
        };
      });

      const combinedOdds = c.combinedOdds !== null ? Number(c.combinedOdds) : null;

      return {
        id: c.id,
        titleFr: c.titleFr,
        titleEn: c.titleEn || c.titleFr,
        descriptionFr: c.descriptionFr,
        descriptionEn: c.descriptionEn || c.descriptionFr,
        source: c.source,
        couponCode: c.couponCode,
        combinedOdds: combinedOdds !== null && Number.isFinite(combinedOdds) ? combinedOdds : null,
        confidenceLabel: c.confidenceLabel,
        settlementStatus: c.settlementStatus,
        validatedAt: c.validatedAt ? c.validatedAt.toISOString() : null,
        settledAt: c.settledAt ? c.settledAt.toISOString() : null,
        createdAt: c.createdAt.toISOString(),
        legs,
      };
    });

    const summary = computeCouponTrackRecordSummary(
      items.map((i) => ({
        settlementStatus: i.settlementStatus,
        combinedOdds: i.combinedOdds,
      })),
    );

    return { summary, coupons: items };
  });
}

export const getPublicCouponTrackRecord = withCatalogCache(
  queryPublicCouponTrackRecordUncached,
  ["ai-coupon-track-record"],
  [PUBLIC_CATALOG_CACHE_TAGS.predictions, PUBLIC_CATALOG_CACHE_TAGS.community],
  180,
);
