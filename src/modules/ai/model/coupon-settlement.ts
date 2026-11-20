import { resolveActualMarketOutcome, type SettlementVerdict } from "@/modules/ai/model/settle";
import type { CouponSettlementStatus } from "@/server/db/schema/community";

export type LegVerdict = SettlementVerdict | null;

export interface CouponTrackRecordSummary {
  totalCoupons: number;
  settledCount: number;
  wonCount: number;
  lostCount: number;
  voidCount: number;
  pendingCount: number;
  winRatePct: number | null;
  avgWinningOdds: number | null;
}

/**
 * Evaluates a single coupon leg against a fixture's final status and score,
 * reusing standard market resolution and adding Double Chance (1X / X2) support.
 */
export function evaluateCouponLegFromFixture(params: {
  fixtureStatus: string;
  homeGoals: number | null;
  awayGoals: number | null;
  market?: string;
  pickedSelection?: string;
  storedVerdict?: SettlementVerdict | null;
}): LegVerdict {
  if (params.storedVerdict) {
    return params.storedVerdict;
  }
  if (["postponed", "cancelled", "abandoned"].includes(params.fixtureStatus)) {
    return "void";
  }
  if (
    params.fixtureStatus !== "finished" ||
    params.homeGoals === null ||
    params.awayGoals === null
  ) {
    return null;
  }
  if (!params.market || !params.pickedSelection) {
    return null;
  }

  if (params.market === "double_chance") {
    if (params.pickedSelection === "1x") {
      return params.homeGoals >= params.awayGoals ? "won" : "lost";
    }
    if (params.pickedSelection === "x2") {
      return params.awayGoals >= params.homeGoals ? "won" : "lost";
    }
    return null;
  }

  if (params.market === "1x2" || params.market === "over_under_25" || params.market === "btts") {
    const actual = resolveActualMarketOutcome(params.market, params.homeGoals, params.awayGoals);
    return actual === params.pickedSelection ? "won" : "lost";
  }

  return null;
}

/**
 * Computes the combined coupon settlement status from its leg verdicts.
 * - Any lost leg -> "lost" immediately
 * - Any pending (null) leg with no loss -> "pending"
 * - All legs decided and at least one "won" -> "won"
 * - All legs "void" -> "void"
 */
export function evaluateCouponSettlement(
  legVerdicts: readonly LegVerdict[],
): CouponSettlementStatus {
  if (legVerdicts.length === 0) return "pending";
  if (legVerdicts.some((v) => v === "lost")) return "lost";
  if (legVerdicts.some((v) => v === null)) return "pending";
  if (legVerdicts.every((v) => v === "void")) return "void";
  return "won";
}

export function computeCouponTrackRecordSummary(
  items: readonly { settlementStatus: CouponSettlementStatus; combinedOdds: number | null }[],
): CouponTrackRecordSummary {
  let wonCount = 0;
  let lostCount = 0;
  let voidCount = 0;
  let pendingCount = 0;
  let winningOddsSum = 0;
  let winningOddsCount = 0;

  for (const item of items) {
    if (item.settlementStatus === "won") {
      wonCount += 1;
      if (
        item.combinedOdds !== null &&
        Number.isFinite(item.combinedOdds) &&
        item.combinedOdds > 1
      ) {
        winningOddsSum += item.combinedOdds;
        winningOddsCount += 1;
      }
    } else if (item.settlementStatus === "lost") {
      lostCount += 1;
    } else if (item.settlementStatus === "void") {
      voidCount += 1;
    } else {
      pendingCount += 1;
    }
  }

  const decided = wonCount + lostCount;
  const winRatePct = decided > 0 ? Math.round((wonCount / decided) * 1000) / 10 : null;
  const avgWinningOdds =
    winningOddsCount > 0 ? Math.round((winningOddsSum / winningOddsCount) * 100) / 100 : null;

  return {
    totalCoupons: items.length,
    settledCount: wonCount + lostCount + voidCount,
    wonCount,
    lostCount,
    voidCount,
    pendingCount,
    winRatePct,
    avgWinningOdds,
  };
}
