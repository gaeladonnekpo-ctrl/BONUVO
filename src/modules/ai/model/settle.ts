import type { PredictionMarketType } from "@/modules/ai/model/poisson";

export type SettlementVerdict = "won" | "lost" | "void";

export interface SettlementEvaluation {
  verdict: SettlementVerdict;
  actualOutcome: string;
  brierScore: number | null;
}

export interface SettledRecordForSummary {
  verdict: SettlementVerdict;
  brierScore: number | null;
  market: PredictionMarketType;
}

export interface AccuracySummary {
  totalSettled: number;
  won: number;
  lost: number;
  voidCount: number;
  winRatePct: number | null;
  avgBrierScore: number | null;
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

export function resolveActualMarketOutcome(
  market: PredictionMarketType,
  homeGoals: number,
  awayGoals: number,
): string {
  if (market === "1x2") {
    if (homeGoals > awayGoals) return "home";
    if (homeGoals < awayGoals) return "away";
    return "draw";
  }
  if (market === "over_under_25") {
    return homeGoals + awayGoals >= 3 ? "over_2_5" : "under_2_5";
  }
  return homeGoals >= 1 && awayGoals >= 1 ? "yes" : "no";
}

export function computeBrierScore(params: {
  market: PredictionMarketType;
  recommendedPick: string;
  actualOutcome: string;
  probabilities: Record<string, number>;
}): number {
  if (params.market === "1x2") {
    const keys = ["home", "draw", "away"] as const;
    const sumSq = keys.reduce((acc, key) => {
      const p = params.probabilities[key] ?? 0;
      const y = params.actualOutcome === key ? 1 : 0;
      return acc + Math.pow(p - y, 2);
    }, 0);
    return round4(sumSq);
  }

  const pSel = params.probabilities[params.recommendedPick] ?? 0.5;
  const yWon = params.recommendedPick === params.actualOutcome ? 1 : 0;
  return round4(Math.pow(pSel - yWon, 2));
}

export function settlePrediction(params: {
  fixtureStatus: string;
  homeGoals: number | null;
  awayGoals: number | null;
  market: PredictionMarketType;
  recommendedPick: string;
  probabilities: Record<string, number>;
}): SettlementEvaluation | null {
  if (["postponed", "cancelled", "abandoned"].includes(params.fixtureStatus)) {
    return {
      verdict: "void",
      actualOutcome: "void",
      brierScore: null,
    };
  }

  if (
    params.fixtureStatus !== "finished" ||
    params.homeGoals === null ||
    params.awayGoals === null
  ) {
    return null;
  }

  const actualOutcome = resolveActualMarketOutcome(
    params.market,
    params.homeGoals,
    params.awayGoals,
  );
  const verdict: SettlementVerdict = params.recommendedPick === actualOutcome ? "won" : "lost";
  const brierScore = computeBrierScore({
    market: params.market,
    recommendedPick: params.recommendedPick,
    actualOutcome,
    probabilities: params.probabilities,
  });

  return {
    verdict,
    actualOutcome,
    brierScore,
  };
}

export function computeAccuracySummary(records: SettledRecordForSummary[]): AccuracySummary {
  let won = 0;
  let lost = 0;
  let voidCount = 0;
  let brierSum = 0;
  let brierCount = 0;

  for (const row of records) {
    if (row.verdict === "won") won += 1;
    else if (row.verdict === "lost") lost += 1;
    else voidCount += 1;

    if (row.verdict !== "void" && row.brierScore !== null) {
      brierSum += row.brierScore;
      brierCount += 1;
    }
  }

  const decided = won + lost;
  const winRatePct = decided > 0 ? round4((won / decided) * 100) : null;
  const avgBrierScore = brierCount > 0 ? round4(brierSum / brierCount) : null;

  return {
    totalSettled: records.length,
    won,
    lost,
    voidCount,
    winRatePct,
    avgBrierScore,
  };
}
