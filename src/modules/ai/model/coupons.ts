import type { PublicFixtureDto } from "@/modules/ai/service/public-ai-types";

export interface SingleBetSuggestion {
  fixtureId: string;
  predictionId: string;
  matchLabel: string;
  homeTeamName: string;
  homeTeamLogo: string;
  awayTeamName: string;
  awayTeamLogo: string;
  leagueName: string;
  leagueLogo: string;
  kickoffAt: string;
  market: string;
  pickedSelection: string;
  marketLabel: string;
  selectionLabel: string;
  probabilityPct: number;
  fairOdds: number;
  riskLevel: "low" | "medium" | "high";
  rationale: string;
}

export interface CombinedCouponLeg {
  fixtureId: string;
  predictionId?: string;
  matchLabel: string;
  homeTeamName: string;
  homeTeamLogo: string;
  awayTeamName: string;
  awayTeamLogo: string;
  leagueName: string;
  leagueLogo: string;
  kickoffAt?: string;
  market?: string;
  pickedSelection?: string;
  marketLabel: string;
  selectionLabel: string;
  probabilityPct: number;
  fairOdds?: number;
}

export interface CombinedCouponDto {
  id: string;
  titleFr: string;
  titleEn: string;
  profile: "safe" | "balanced" | "bold";
  riskLevel: "low" | "medium" | "high";
  combinedProbabilityPct: number;
  combinedFairOdds: number;
  legs: CombinedCouponLeg[];
  rationaleFr: string;
  rationaleEn: string;
}

export interface GamingCategoryGuide {
  id: string;
  titleFr: string;
  titleEn: string;
  riskProfileFr: string;
  riskProfileEn: string;
  guidanceFr: string;
  guidanceEn: string;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Estimates joint coupon probability without assuming strict statistical independence.
 * Applies a conservative correlation penalty for shared slate/league regime effects.
 */
export function computeCorrelatedComboProbability(legProbs: number[], sameLeaguePairs = 0): number {
  if (legProbs.length === 0) return 0;
  const naive = legProbs.reduce((acc, p) => acc * Math.min(0.99, Math.max(0.01, p)), 1);
  if (legProbs.length === 1) return naive;
  const penalty = Math.max(0.65, 1 - 0.04 * (legProbs.length - 1) - 0.03 * sameLeaguePairs);
  return Math.max(0.01, Math.min(naive, naive * penalty));
}

function countSameLeaguePairs(legs: Array<{ leagueName: string }>): number {
  let pairs = 0;
  for (let i = 0; i < legs.length; i += 1) {
    for (let j = i + 1; j < legs.length; j += 1) {
      if (legs[i]?.leagueName && legs[i]?.leagueName === legs[j]?.leagueName) pairs += 1;
    }
  }
  return pairs;
}

function deriveDoubleChanceCandidate(fix: PublicFixtureDto): SingleBetSuggestion | null {
  const pred = fix.predictions.find((p) => p.market === "1x2");
  if (!pred) return null;
  const pHome = pred.probabilities.home ?? 0;
  const pDraw = pred.probabilities.draw ?? 0;
  const pAway = pred.probabilities.away ?? 0;
  const p1x = pHome + pDraw;
  const px2 = pDraw + pAway;
  const bestProb = p1x >= px2 ? p1x : px2;
  if (bestProb <= 0.5) return null;

  const pickLabel =
    p1x >= px2 ? `1X (${fix.homeTeamName} ou Nul)` : `X2 (Nul ou ${fix.awayTeamName})`;
  const probPct = Math.round(bestProb * 1000) / 10;
  return {
    fixtureId: fix.id,
    predictionId: pred.id,
    matchLabel: `${fix.homeTeamName} vs ${fix.awayTeamName}`,
    homeTeamName: fix.homeTeamName,
    homeTeamLogo: fix.homeTeamLogo,
    awayTeamName: fix.awayTeamName,
    awayTeamLogo: fix.awayTeamLogo,
    leagueName: fix.leagueName,
    leagueLogo: fix.leagueLogo,
    kickoffAt: fix.kickoffAt,
    market: "double_chance",
    pickedSelection: p1x >= px2 ? "1x" : "x2",
    marketLabel: "Double Chance",
    selectionLabel: pickLabel,
    probabilityPct: probPct,
    fairOdds: round2(1 / Math.max(0.05, bestProb)),
    riskLevel: probPct >= 72 ? "low" : probPct >= 58 ? "medium" : "high",
    rationale: pred.analysisText,
  };
}

function formatSelectionLabel(
  fix: PublicFixtureDto,
  market: string,
  selection: string,
): { marketLabel: string; selectionLabel: string } {
  if (market === "1x2") {
    const sel =
      selection === "home"
        ? `1 · ${fix.homeTeamName}`
        : selection === "away"
          ? `2 · ${fix.awayTeamName}`
          : "X · Match nul";
    return { marketLabel: "1X2", selectionLabel: sel };
  }
  if (market === "over_under_25") {
    return {
      marketLabel: "Total buts 2.5",
      selectionLabel: selection === "over_2_5" ? "Plus de 2,5 buts" : "Moins de 2,5 buts",
    };
  }
  return {
    marketLabel: "Les deux marquent",
    selectionLabel: selection === "yes" ? "BTTS Oui" : "BTTS Non",
  };
}

export function buildSinglePicks(fixtures: PublicFixtureDto[]): SingleBetSuggestion[] {
  const candidates: SingleBetSuggestion[] = [];
  for (const fix of fixtures) {
    for (const pred of fix.predictions) {
      const topProb = pred.probabilities[pred.pickedSelection] ?? 0;
      if (topProb <= 0) continue;
      const probPct = Math.round(topProb * 1000) / 10;
      const labels = formatSelectionLabel(fix, pred.market, pred.pickedSelection);
      candidates.push({
        fixtureId: fix.id,
        predictionId: pred.id,
        matchLabel: `${fix.homeTeamName} vs ${fix.awayTeamName}`,
        homeTeamName: fix.homeTeamName,
        homeTeamLogo: fix.homeTeamLogo,
        awayTeamName: fix.awayTeamName,
        awayTeamLogo: fix.awayTeamLogo,
        leagueName: fix.leagueName,
        leagueLogo: fix.leagueLogo,
        kickoffAt: fix.kickoffAt,
        market: pred.market,
        pickedSelection: pred.pickedSelection,
        marketLabel: labels.marketLabel,
        selectionLabel: labels.selectionLabel,
        probabilityPct: probPct,
        fairOdds: round2(1 / Math.max(0.05, topProb)),
        riskLevel: probPct >= 62 ? "low" : probPct >= 48 ? "medium" : "high",
        rationale: pred.analysisText,
      });
    }
    const dc = deriveDoubleChanceCandidate(fix);
    if (dc) candidates.push(dc);
  }
  return candidates.sort((a, b) => b.probabilityPct - a.probabilityPct).slice(0, 12);
}

function toCouponLeg(l: SingleBetSuggestion): CombinedCouponLeg {
  return {
    fixtureId: l.fixtureId,
    predictionId: l.predictionId,
    matchLabel: l.matchLabel,
    homeTeamName: l.homeTeamName,
    homeTeamLogo: l.homeTeamLogo,
    awayTeamName: l.awayTeamName,
    awayTeamLogo: l.awayTeamLogo,
    leagueName: l.leagueName,
    leagueLogo: l.leagueLogo,
    kickoffAt: l.kickoffAt,
    market: l.market,
    pickedSelection: l.pickedSelection,
    marketLabel: l.marketLabel,
    selectionLabel: l.selectionLabel,
    probabilityPct: l.probabilityPct,
    fairOdds: l.fairOdds,
  };
}

export function buildCombinedCoupons(fixtures: PublicFixtureDto[]): CombinedCouponDto[] {
  const upcomingWithPreds = fixtures.filter((f) => f.predictions.length > 0);
  if (upcomingWithPreds.length < 2) return [];

  const dcLegs = upcomingWithPreds
    .map((f) => deriveDoubleChanceCandidate(f))
    .filter((x): x is SingleBetSuggestion => x !== null)
    .sort((a, b) => b.probabilityPct - a.probabilityPct);

  const primaryLegs = buildSinglePicks(upcomingWithPreds).filter(
    (s) => s.marketLabel !== "Double Chance",
  );
  const coupons: CombinedCouponDto[] = [];

  if (dcLegs.length >= 2) {
    const safeSelection = dcLegs.slice(0, 2);
    const joint = computeCorrelatedComboProbability(
      safeSelection.map((l) => l.probabilityPct / 100),
      countSameLeaguePairs(safeSelection),
    );
    coupons.push({
      id: "coupon-safe-2",
      titleFr: "Combiné Prudent · 2 sélections",
      titleEn: "Low-Variance Combo · 2 legs",
      profile: "safe",
      riskLevel: joint >= 0.55 ? "low" : "medium",
      combinedProbabilityPct: Math.round(joint * 1000) / 10,
      combinedFairOdds: round2(1 / Math.max(0.02, joint)),
      legs: safeSelection.map(toCouponLeg),
      rationaleFr:
        "Association des deux chances doubles affichant les probabilités conjointes les plus élevées du programme réel.",
      rationaleEn:
        "Combines the two highest-probability double chance outcomes from the live fixture slate.",
    });
  }

  const uniqueFixtureBalanced: SingleBetSuggestion[] = [];
  const usedFixtures = new Set<string>();
  for (const s of primaryLegs) {
    if (usedFixtures.has(s.fixtureId)) continue;
    usedFixtures.add(s.fixtureId);
    uniqueFixtureBalanced.push(s);
    if (uniqueFixtureBalanced.length >= 3) break;
  }

  if (uniqueFixtureBalanced.length >= 2) {
    const joint = computeCorrelatedComboProbability(
      uniqueFixtureBalanced.map((l) => l.probabilityPct / 100),
      countSameLeaguePairs(uniqueFixtureBalanced),
    );
    coupons.push({
      id: "coupon-balanced-3",
      titleFr: `Combiné Équilibré · ${uniqueFixtureBalanced.length} sélections`,
      titleEn: `Balanced Multi-Market Combo · ${uniqueFixtureBalanced.length} legs`,
      profile: "balanced",
      riskLevel: joint >= 0.35 ? "medium" : "high",
      combinedProbabilityPct: Math.round(joint * 1000) / 10,
      combinedFairOdds: round2(1 / Math.max(0.01, joint)),
      legs: uniqueFixtureBalanced.map(toCouponLeg),
      rationaleFr:
        "Une sélection distincte par rencontre (1X2, +2.5 ou BTTS) sélectionnée selon les différentiels statistiques récents.",
      rationaleEn:
        "One independent pick per match across 1X2, Over/Under 2.5, and BTTS based on real statistical differentials.",
    });
  }

  return coupons;
}

export const PLATFORM_GAMING_GUIDES: GamingCategoryGuide[] = [
  {
    id: "sports-singles",
    titleFr: "Paris simples & Double Chance",
    titleEn: "Single Bets & Double Chance",
    riskProfileFr: "Risque maîtrisé (1 à 2 % du budget)",
    riskProfileEn: "Controlled risk (1%–2% budget stake)",
    guidanceFr:
      "Privilégie les marchés 1X2 ou Double Chance lorsque l'écart de probabilité estimé dépasse +15 points sur des équipes disposant d'un historique complet.",
    guidanceEn:
      "Focus on 1X2 or Double Chance when the estimated probability gap exceeds +15 points across teams with sufficient match history.",
  },
  {
    id: "sports-combos",
    titleFr: "Paris combinés (2 à 3 sélections)",
    titleEn: "Combined Coupons (2–3 legs)",
    riskProfileFr: "Risque plus élevé (probabilités cumulées)",
    riskProfileEn: "Higher risk (combined probability)",
    guidanceFr:
      "Chaque sélection ajoutée augmente le niveau de risque global : privilégiez des combinés courts de 2 à 3 matchs indépendants.",
    guidanceEn:
      "Each added selection increases overall risk; keep combined tickets to 2–3 independent matches.",
  },
  {
    id: "casino-rng",
    titleFr: "Jeux rapides, Crash & Casino",
    titleEn: "Crash, Instant & Casino Games",
    riskProfileFr: "Hasard pur (chaque tour est indépendant)",
    riskProfileEn: "Pure chance (independent rounds)",
    guidanceFr:
      "Les tirages et jeux Crash sont totalement indépendants d'un tour à l'autre : aucune série passée n'influence le tour suivant ; fixez toujours un budget strict.",
    guidanceEn:
      "Instant and crash rounds are completely independent: past outcomes never predict the next round — always enforce a strict budget.",
  },
];
