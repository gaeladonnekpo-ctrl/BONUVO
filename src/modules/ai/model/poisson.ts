import {
  DEFAULT_LEAGUE_AWAY_AVG,
  DEFAULT_LEAGUE_HOME_AVG,
  MAX_POISSON_GOALS,
  MIN_MATCHES_THRESHOLD,
  MODEL_VERSION_TAG,
  buildDeterministicAnalysisText,
  calibrateProbabilities,
  clamp,
  computeAttackAndDefenseRates,
  computeInputSnapshotHash,
  poissonPmf,
  resolveConfidence,
  round4,
  type LeagueBaselineInput,
  type PredictionConfidenceTier,
  type PredictionMarketType,
  type TeamModelInput,
} from "@/modules/ai/model/poisson-math";

export {
  DEFAULT_LEAGUE_AWAY_AVG,
  DEFAULT_LEAGUE_HOME_AVG,
  MAX_POISSON_GOALS,
  MIN_MATCHES_THRESHOLD,
  MODEL_VERSION_TAG,
  computeInputSnapshotHash,
  poissonPmf,
  type LeagueBaselineInput,
  type PredictionConfidenceTier,
  type PredictionMarketType,
  type TeamModelInput,
};

export interface MarketPredictionOutput {
  market: PredictionMarketType;
  recommendedPick: string;
  confidenceTier: PredictionConfidenceTier;
  confidenceScore: number;
  probabilities: Record<string, number>;
  analysisText: string;
}

export interface PoissonPredictionResult {
  eligible: true;
  modelVersion: string;
  expectedHomeGoals: number;
  expectedAwayGoals: number;
  inputSnapshotHash: string;
  markets: MarketPredictionOutput[];
}

export interface PoissonRefusalResult {
  eligible: false;
  reason: "INSUFFICIENT_DATA";
  minMatchesRequired: number;
  homeMatchesPlayed: number;
  awayMatchesPlayed: number;
}

export function predictFixtureMarkets(params: {
  fixtureId: string;
  home: TeamModelInput;
  away: TeamModelInput;
  baseline?: LeagueBaselineInput;
}): PoissonPredictionResult | PoissonRefusalResult {
  const { home, away } = params;
  if (home.matchesPlayed < MIN_MATCHES_THRESHOLD || away.matchesPlayed < MIN_MATCHES_THRESHOLD) {
    return {
      eligible: false,
      reason: "INSUFFICIENT_DATA",
      minMatchesRequired: MIN_MATCHES_THRESHOLD,
      homeMatchesPlayed: home.matchesPlayed,
      awayMatchesPlayed: away.matchesPlayed,
    };
  }

  const muHome = clamp(params.baseline?.homeGoalAvg ?? DEFAULT_LEAGUE_HOME_AVG, 0.8, 2.4);
  const muAway = clamp(params.baseline?.awayGoalAvg ?? DEFAULT_LEAGUE_AWAY_AVG, 0.6, 2.1);
  const homeRates = computeAttackAndDefenseRates(home, "home", {
    homeGoalAvg: muHome,
    awayGoalAvg: muAway,
  });
  const awayRates = computeAttackAndDefenseRates(away, "away", {
    homeGoalAvg: muHome,
    awayGoalAvg: muAway,
  });

  const lambdaHome = round4(
    clamp(muHome * (homeRates.attack / muHome) * (awayRates.defense / muHome), 0.25, 3.2),
  );
  const lambdaAway = round4(
    clamp(muAway * (awayRates.attack / muAway) * (homeRates.defense / muAway), 0.25, 3.2),
  );

  let pHomeRaw = 0;
  let pDrawRaw = 0;
  let pAwayRaw = 0;
  let pOver25Raw = 0;
  let pUnder25Raw = 0;
  let pBttsYesRaw = 0;
  let pBttsNoRaw = 0;
  let matrixMass = 0;

  for (let i = 0; i <= MAX_POISSON_GOALS; i += 1) {
    const px = poissonPmf(lambdaHome, i);
    for (let j = 0; j <= MAX_POISSON_GOALS; j += 1) {
      const joint = px * poissonPmf(lambdaAway, j);
      matrixMass += joint;
      if (i > j) pHomeRaw += joint;
      else if (i === j) pDrawRaw += joint;
      else pAwayRaw += joint;

      if (i + j >= 3) pOver25Raw += joint;
      else pUnder25Raw += joint;

      if (i >= 1 && j >= 1) pBttsYesRaw += joint;
      else pBttsNoRaw += joint;
    }
  }

  const norm = matrixMass > 0 ? matrixMass : 1;
  const probs1x2Arr = calibrateProbabilities([pHomeRaw / norm, pDrawRaw / norm, pAwayRaw / norm]);
  const probsOuArr = calibrateProbabilities([pOver25Raw / norm, pUnder25Raw / norm]);
  const probsBttsArr = calibrateProbabilities([pBttsYesRaw / norm, pBttsNoRaw / norm]);
  const probHome = probs1x2Arr[0] ?? 0;
  const probDraw = probs1x2Arr[1] ?? 0;
  const probAway = probs1x2Arr[2] ?? 0;
  const probOver25 = probsOuArr[0] ?? 0;
  const probUnder25 = probsOuArr[1] ?? 0;
  const probBttsYes = probsBttsArr[0] ?? 0;
  const probBttsNo = probsBttsArr[1] ?? 0;

  const minMatches = Math.min(home.matchesPlayed, away.matchesPlayed);
  const marketSpecs: Array<{
    market: PredictionMarketType;
    probs: Record<string, number>;
    entries: Array<[string, number]>;
  }> = [
    {
      market: "1x2",
      probs: { home: probHome, draw: probDraw, away: probAway },
      entries: [
        ["home", probHome],
        ["draw", probDraw],
        ["away", probAway],
      ],
    },
    {
      market: "over_under_25",
      probs: { over_2_5: probOver25, under_2_5: probUnder25 },
      entries: [
        ["over_2_5", probOver25],
        ["under_2_5", probUnder25],
      ],
    },
    {
      market: "btts",
      probs: { yes: probBttsYes, no: probBttsNo },
      entries: [
        ["yes", probBttsYes],
        ["no", probBttsNo],
      ],
    },
  ];

  const markets: MarketPredictionOutput[] = marketSpecs.map((spec) => {
    const sorted = [...spec.entries].sort((a, b) => b[1] - a[1]);
    const topPick = sorted[0]?.[0] ?? "";
    const conf = resolveConfidence(
      sorted.map((s) => s[1]),
      minMatches,
    );
    return {
      market: spec.market,
      recommendedPick: topPick,
      confidenceTier: conf.tier,
      confidenceScore: conf.score,
      probabilities: spec.probs,
      analysisText: buildDeterministicAnalysisText({
        market: spec.market,
        pick: topPick,
        probabilities: spec.probs,
        home,
        away,
        lambdaHome,
        lambdaAway,
      }),
    };
  });

  return {
    eligible: true,
    modelVersion: MODEL_VERSION_TAG,
    expectedHomeGoals: lambdaHome,
    expectedAwayGoals: lambdaAway,
    inputSnapshotHash: computeInputSnapshotHash({
      fixtureId: params.fixtureId,
      home,
      away,
      baseline: { homeGoalAvg: muHome, awayGoalAvg: muAway },
    }),
    markets,
  };
}
