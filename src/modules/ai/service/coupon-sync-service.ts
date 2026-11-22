import { and, eq, gte, inArray, or } from "drizzle-orm";
import {
  evaluateCouponLegFromFixture,
  evaluateCouponSettlement,
  type LegVerdict,
} from "@/modules/ai/model/coupon-settlement";
import { buildCombinedCoupons } from "@/modules/ai/model/coupons";
import type { PublicFixtureDto } from "@/modules/ai/service/public-ai-types";
import type { AppDbTransaction } from "@/server/db/context";
import { coupons, fixtures, predictionResults, type CouponLegSnapshot } from "@/server/db/schema";

function formatLocalDateIso(date: Date, tzOffsetMinutes = 60): string {
  const shifted = new Date(date.getTime() + tzOffsetMinutes * 60_000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Persists BONUVO AI combined coupons generated from upcoming fixtures into `public.coupons`
 * using a daily idempotent `externalKey` (`ai:YYYY-MM-DD:safe|balanced|diversified|bold`).
 * Never overwrites a coupon that has already been settled.
 */
export async function syncCombinedCouponsForFixtures(
  db: AppDbTransaction,
  upcomingFixtures: PublicFixtureDto[],
  now = new Date(),
): Promise<number> {
  const generated = buildCombinedCoupons(upcomingFixtures);
  if (generated.length === 0) return 0;

  const dateKey = formatLocalDateIso(now, 60);
  let synced = 0;

  for (const combo of generated) {
    const externalKey = `ai:${dateKey}:${combo.profile}`;
    const predictionIds = Array.from(
      new Set(
        combo.legs
          .map((l) => l.predictionId)
          .filter((id): id is string => typeof id === "string" && id.length > 0),
      ),
    );
    const legsSnapshot: CouponLegSnapshot[] = combo.legs.map((l) => ({
      fixtureId: l.fixtureId,
      predictionId: l.predictionId,
      matchLabel: l.matchLabel,
      leagueName: l.leagueName,
      market: l.market,
      marketLabel: l.marketLabel,
      pickedSelection: l.pickedSelection,
      selectionLabel: l.selectionLabel,
      probabilityPct: l.probabilityPct,
      fairOdds: l.fairOdds,
      kickoffAt: l.kickoffAt,
    }));

    const [existing] = await db
      .select({ id: coupons.id, settlementStatus: coupons.settlementStatus })
      .from(coupons)
      .where(eq(coupons.externalKey, externalKey))
      .limit(1);

    if (existing) {
      if (existing.settlementStatus === "pending") {
        await db
          .update(coupons)
          .set({
            titleFr: combo.titleFr,
            titleEn: combo.titleEn,
            descriptionFr: combo.rationaleFr,
            descriptionEn: combo.rationaleEn,
            combinedOdds: combo.combinedFairOdds.toFixed(2),
            confidenceLabel: combo.riskLevel,
            predictionIds,
            legsJson: legsSnapshot,
            updatedAt: now,
          })
          .where(eq(coupons.id, existing.id));
        synced += 1;
      }
      continue;
    }

    await db.insert(coupons).values({
      titleFr: combo.titleFr,
      titleEn: combo.titleEn,
      descriptionFr: combo.rationaleFr,
      descriptionEn: combo.rationaleEn,
      countryCode: "GLOBAL",
      couponCode: `BONUVO-${combo.profile.toUpperCase()}`,
      combinedOdds: combo.combinedFairOdds.toFixed(2),
      confidenceLabel: combo.riskLevel,
      predictionIds,
      legsJson: legsSnapshot,
      status: "validated",
      settlementStatus: "pending",
      source: "bonuvo_ai",
      externalKey,
      validatedAt: now,
    });
    synced += 1;
  }

  return synced;
}

/**
 * Automatically updates `settlementStatus` and `settledAt` on all pending validated coupons
 * and re-verifies recently settled coupons (last 7 days) in case an official match score
 * or status was corrected after initial settlement.
 */
export async function reconcilePendingCoupons(
  db: AppDbTransaction,
  now = new Date(),
  options?: { recheckSettledDays?: number },
): Promise<{
  couponsSettledCount: number;
  couponsWonCount: number;
  couponsLostCount: number;
  couponsVoidCount: number;
}> {
  const recheckDays = options?.recheckSettledDays ?? 7;
  const recentCutoff = new Date(now.getTime() - recheckDays * 24 * 3600_000);

  const candidateCoupons = await db
    .select()
    .from(coupons)
    .where(
      and(
        eq(coupons.status, "validated"),
        or(eq(coupons.settlementStatus, "pending"), gte(coupons.settledAt, recentCutoff)),
      ),
    );

  if (candidateCoupons.length === 0) {
    return {
      couponsSettledCount: 0,
      couponsWonCount: 0,
      couponsLostCount: 0,
      couponsVoidCount: 0,
    };
  }

  const allFixtureIds = Array.from(
    new Set(
      candidateCoupons.flatMap((c) =>
        Array.isArray(c.legsJson) ? c.legsJson.map((l) => l.fixtureId).filter(Boolean) : [],
      ),
    ),
  );
  const allPredictionIds = Array.from(
    new Set([
      ...candidateCoupons.flatMap((c) => c.predictionIds ?? []),
      ...candidateCoupons.flatMap((c) =>
        Array.isArray(c.legsJson)
          ? c.legsJson.map((l) => l.predictionId).filter((id): id is string => Boolean(id))
          : [],
      ),
    ]),
  );

  const [fixtureRows, resultRows] = await Promise.all([
    allFixtureIds.length > 0
      ? db
          .select({
            id: fixtures.id,
            fixtureStatus: fixtures.fixtureStatus,
            homeGoals: fixtures.homeGoals,
            awayGoals: fixtures.awayGoals,
          })
          .from(fixtures)
          .where(inArray(fixtures.id, allFixtureIds))
      : Promise.resolve([]),
    allPredictionIds.length > 0
      ? db
          .select({
            predictionId: predictionResults.predictionId,
            verdict: predictionResults.verdict,
          })
          .from(predictionResults)
          .where(inArray(predictionResults.predictionId, allPredictionIds))
      : Promise.resolve([]),
  ]);

  const fixtureById = new Map(fixtureRows.map((f) => [f.id, f]));
  const verdictByPredictionId = new Map(resultRows.map((r) => [r.predictionId, r.verdict]));

  let couponsSettledCount = 0;
  let couponsWonCount = 0;
  let couponsLostCount = 0;
  let couponsVoidCount = 0;

  for (const coupon of candidateCoupons) {
    const legs = Array.isArray(coupon.legsJson) ? coupon.legsJson : [];
    const verdicts: LegVerdict[] = [];

    if (legs.length > 0) {
      for (const leg of legs) {
        const fix = fixtureById.get(leg.fixtureId);
        const storedVerdict = leg.predictionId
          ? (verdictByPredictionId.get(leg.predictionId) ?? null)
          : null;

        // Always re-evaluate directly from the latest confirmed fixture score when fixture data exists
        // so corrected official scores propagate immediately to both pending and settled coupons.
        if (fix) {
          verdicts.push(
            evaluateCouponLegFromFixture({
              fixtureStatus: fix.fixtureStatus,
              homeGoals: fix.homeGoals,
              awayGoals: fix.awayGoals,
              market: leg.market,
              pickedSelection: leg.pickedSelection,
            }),
          );
        } else {
          verdicts.push(storedVerdict);
        }
      }
    } else if ((coupon.predictionIds ?? []).length > 0) {
      for (const predId of coupon.predictionIds) {
        verdicts.push(verdictByPredictionId.get(predId) ?? null);
      }
    }

    if (verdicts.length === 0) continue;

    const nextStatus = evaluateCouponSettlement(verdicts);
    if (nextStatus === coupon.settlementStatus) continue;
    if (nextStatus === "pending" && coupon.settlementStatus === "pending") continue;

    await db
      .update(coupons)
      .set({
        settlementStatus: nextStatus,
        settledAt: nextStatus === "pending" ? null : now,
        updatedAt: now,
      })
      .where(eq(coupons.id, coupon.id));

    if (nextStatus !== "pending") {
      couponsSettledCount += 1;
      if (nextStatus === "won") couponsWonCount += 1;
      else if (nextStatus === "lost") couponsLostCount += 1;
      else couponsVoidCount += 1;
    }
  }

  return {
    couponsSettledCount,
    couponsWonCount,
    couponsLostCount,
    couponsVoidCount,
  };
}
