import { createHash } from "node:crypto";

export const MODEL_VERSION_TAG = "poisson-v2.0";
export const MIN_MATCHES_THRESHOLD = 6;
export const MAX_POISSON_GOALS = 10;
export const DEFAULT_LEAGUE_HOME_AVG = 1.45;
export const DEFAULT_LEAGUE_AWAY_AVG = 1.15;
export const PRIOR_MATCHES_WEIGHT = 8;
export const MIN_STRENGTH_RATIO = 0.55;
export const MAX_STRENGTH_RATIO = 1.75;
export const CALIBRATION_TEMPERATURE = 1.08;

export type PredictionMarketType = "1x2" | "over_under_25" | "btts";
export type PredictionConfidenceTier = "low" | "medium" | "high";

export interface TeamModelInput {
  teamId: string;
  teamName: string;
  matchesPlayed: number;
  goalsFor: number;
  goalsAgainst: number;
  homeMatches: number;
  homeGoalsFor: number;
  homeGoalsAgainst: number;
  awayMatches: number;
  awayGoalsFor: number;
  awayGoalsAgainst: number;
  recentForm?: string | null;
}

export interface LeagueBaselineInput {
  homeGoalAvg?: number;
  awayGoalAvg?: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function factorial(n: number): number {
  let result = 1;
  for (let i = 2; i <= n; i += 1) result *= i;
  return result;
}

export function poissonPmf(lambda: number, k: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
}

/** Normalizes probabilities into basis points (10,000 = 1.0000) so sums match 1. */
export function normalizeToBasisPoints(raw: number[]): number[] {
  const total = raw.reduce((acc, v) => acc + v, 0);
  const scaled = raw.map((v) => (total > 0 ? (v / total) * 10_000 : 10_000 / raw.length));
  const floored = scaled.map((v) => Math.floor(v));
  let remainder = 10_000 - floored.reduce((acc, v) => acc + v, 0);
  const indices = scaled
    .map((v, idx) => ({ idx, frac: v - (floored[idx] ?? 0) }))
    .sort((a, b) => b.frac - a.frac);
  let cursor = 0;
  while (remainder > 0 && indices.length > 0) {
    const slot = indices[cursor % indices.length];
    if (slot) {
      floored[slot.idx] = (floored[slot.idx] ?? 0) + 1;
    }
    remainder -= 1;
    cursor += 1;
  }
  return floored.map((bp) => bp / 10_000);
}

function computeFormFactor(form: string | null | undefined, baseRate: number): number {
  if (!form || form.trim().length === 0) return baseRate;
  const recent = form.trim().toUpperCase().slice(-5);
  let points = 0;
  let count = 0;
  for (const ch of recent) {
    if (ch === "W") {
      points += 3;
      count += 1;
    } else if (ch === "D") {
      points += 1;
      count += 1;
    } else if (ch === "L") {
      count += 1;
    }
  }
  if (count === 0) return baseRate;
  const formRatio = points / (count * 3);
  const multiplier = 0.85 + formRatio * 0.3;
  return baseRate * 0.7 + baseRate * multiplier * 0.3;
}

export function computeAttackAndDefenseRates(
  team: TeamModelInput,
  side: "home" | "away",
  baseline?: LeagueBaselineInput,
): { attack: number; defense: number } {
  const muHome = clamp(baseline?.homeGoalAvg ?? DEFAULT_LEAGUE_HOME_AVG, 0.8, 2.4);
  const muAway = clamp(baseline?.awayGoalAvg ?? DEFAULT_LEAGUE_AWAY_AVG, 0.6, 2.1);
  const attackPrior = side === "home" ? muHome : muAway;
  const defensePrior = side === "home" ? muAway : muHome;

  const useSplit = side === "home" ? team.homeMatches >= 4 : team.awayMatches >= 4;
  const matches = useSplit
    ? side === "home"
      ? team.homeMatches
      : team.awayMatches
    : team.matchesPlayed;
  const goalsFor = useSplit
    ? side === "home"
      ? team.homeGoalsFor
      : team.awayGoalsFor
    : team.goalsFor;
  const goalsAgainst = useSplit
    ? side === "home"
      ? team.homeGoalsAgainst
      : team.awayGoalsAgainst
    : team.goalsAgainst;

  // Empirical Bayes shrinkage toward league baseline to cap extreme early/outlier differentials
  const shrunkAttack =
    (Math.max(0, goalsFor) + PRIOR_MATCHES_WEIGHT * attackPrior) /
    (Math.max(0, matches) + PRIOR_MATCHES_WEIGHT);
  const shrunkDefense =
    (Math.max(0, goalsAgainst) + PRIOR_MATCHES_WEIGHT * defensePrior) /
    (Math.max(0, matches) + PRIOR_MATCHES_WEIGHT);

  const formAdjustedAttack = computeFormFactor(team.recentForm, shrunkAttack);
  const cappedAttack =
    attackPrior * clamp(formAdjustedAttack / attackPrior, MIN_STRENGTH_RATIO, MAX_STRENGTH_RATIO);
  const cappedDefense =
    defensePrior * clamp(shrunkDefense / defensePrior, MIN_STRENGTH_RATIO, MAX_STRENGTH_RATIO);

  return {
    attack: round4(Math.max(0.25, cappedAttack)),
    defense: round4(Math.max(0.25, cappedDefense)),
  };
}

/** Applies temperature calibration before basis-point normalization to avoid overconfident tails. */
export function calibrateProbabilities(
  raw: number[],
  temperature = CALIBRATION_TEMPERATURE,
): number[] {
  const invT = temperature > 0 ? 1 / temperature : 1;
  const tempered = raw.map((p) => Math.pow(Math.max(1e-6, p), invT));
  return normalizeToBasisPoints(tempered);
}

export function resolveConfidence(
  sortedProbs: number[],
  minMatches: number,
): { tier: PredictionConfidenceTier; score: number } {
  const p1 = sortedProbs[0] ?? 0;
  const p2 = sortedProbs[1] ?? 0;
  const delta = Math.max(0, p1 - p2);
  const rawScore = 0.7 * Math.min(1, delta / 0.35) + 0.3 * Math.min(1, minMatches / 20);
  const score = round4(clamp(rawScore, 0, 1));

  if (delta >= 0.22 && minMatches >= 12 && p1 >= 0.55) {
    return { tier: "high", score };
  }
  if (delta >= 0.1 && minMatches >= 8) {
    return { tier: "medium", score };
  }
  return { tier: "low", score };
}

export function computeInputSnapshotHash(params: {
  fixtureId: string;
  home: TeamModelInput;
  away: TeamModelInput;
  baseline: LeagueBaselineInput;
}): string {
  const canonical = JSON.stringify({
    modelVersion: MODEL_VERSION_TAG,
    fixtureId: params.fixtureId,
    baseline: {
      homeGoalAvg: params.baseline.homeGoalAvg ?? DEFAULT_LEAGUE_HOME_AVG,
      awayGoalAvg: params.baseline.awayGoalAvg ?? DEFAULT_LEAGUE_AWAY_AVG,
    },
    home: {
      teamId: params.home.teamId,
      matchesPlayed: params.home.matchesPlayed,
      goalsFor: params.home.goalsFor,
      goalsAgainst: params.home.goalsAgainst,
      homeMatches: params.home.homeMatches,
      homeGoalsFor: params.home.homeGoalsFor,
      homeGoalsAgainst: params.home.homeGoalsAgainst,
      recentForm: params.home.recentForm ?? null,
    },
    away: {
      teamId: params.away.teamId,
      matchesPlayed: params.away.matchesPlayed,
      goalsFor: params.away.goalsFor,
      goalsAgainst: params.away.goalsAgainst,
      awayMatches: params.away.awayMatches,
      awayGoalsFor: params.away.awayGoalsFor,
      awayGoalsAgainst: params.away.awayGoalsAgainst,
      recentForm: params.away.recentForm ?? null,
    },
  });
  return createHash("sha256").update(canonical).digest("hex");
}

export function buildDeterministicAnalysisText(params: {
  market: PredictionMarketType;
  pick: string;
  probabilities: Record<string, number>;
  home: TeamModelInput;
  away: TeamModelInput;
  lambdaHome: number;
  lambdaAway: number;
}): string {
  const pct = (value: number) => `${Math.round(value * 100)}%`;
  const baseStats = `${params.home.teamName} (${params.home.matchesPlayed} matchs, ${params.home.goalsFor} buts marqués / ${params.home.goalsAgainst} encaissés) face à ${params.away.teamName} (${params.away.matchesPlayed} matchs, ${params.away.goalsFor} marqués / ${params.away.goalsAgainst} encaissés). Moyenne de buts estimée : ${params.lambdaHome.toFixed(2)} - ${params.lambdaAway.toFixed(2)}.`;

  if (params.market === "1x2") {
    const pickLabel =
      params.pick === "home"
        ? params.home.teamName
        : params.pick === "away"
          ? params.away.teamName
          : "match nul";
    return `${baseStats} Probabilités estimées : domicile ${pct(params.probabilities.home ?? 0)}, nul ${pct(params.probabilities.draw ?? 0)}, extérieur ${pct(params.probabilities.away ?? 0)} (tendance : ${pickLabel}).`;
  }
  if (params.market === "over_under_25") {
    const pickLabel = params.pick === "over_2_5" ? "+2,5 buts" : "-2,5 buts";
    return `${baseStats} Probabilités estimées : Plus de 2,5 buts ${pct(params.probabilities.over_2_5 ?? 0)}, Moins de 2,5 buts ${pct(params.probabilities.under_2_5 ?? 0)} (tendance : ${pickLabel}).`;
  }
  const pickLabel = params.pick === "yes" ? "Oui" : "Non";
  return `${baseStats} Probabilité que les deux équipes marquent : Oui ${pct(params.probabilities.yes ?? 0)}, Non ${pct(params.probabilities.no ?? 0)} (tendance : ${pickLabel}).`;
}
