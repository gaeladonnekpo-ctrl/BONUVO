import type { PublicFixtureDto } from "@/modules/ai/service/public-ai-types";

export interface SingleBetSuggestion {
  fixtureId: string;
  predictionId: string;
  matchLabel: string;
  leagueName: string;
  kickoffAt: string;
  marketLabel: string;
  selectionLabel: string;
  probabilityPct: number;
  fairOdds: number;
  riskLevel: "low" | "medium" | "high";
  rationale: string;
}

export interface CombinedCouponLeg {
  fixtureId: string;
  matchLabel: string;
  leagueName: string;
  marketLabel: string;
  selectionLabel: string;
  probabilityPct: number;
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
    leagueName: fix.leagueName,
    kickoffAt: fix.kickoffAt,
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
        leagueName: fix.leagueName,
        kickoffAt: fix.kickoffAt,
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
    const joint = safeSelection.reduce((acc, l) => acc * (l.probabilityPct / 100), 1);
    coupons.push({
      id: "coupon-safe-2",
      titleFr: "Combiné Prudent · 2 sélections",
      titleEn: "Low-Variance Combo · 2 legs",
      profile: "safe",
      riskLevel: joint >= 0.55 ? "low" : "medium",
      combinedProbabilityPct: Math.round(joint * 1000) / 10,
      combinedFairOdds: round2(1 / Math.max(0.02, joint)),
      legs: safeSelection.map((l) => ({
        fixtureId: l.fixtureId,
        matchLabel: l.matchLabel,
        leagueName: l.leagueName,
        marketLabel: l.marketLabel,
        selectionLabel: l.selectionLabel,
        probabilityPct: l.probabilityPct,
      })),
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
    const joint = uniqueFixtureBalanced.reduce((acc, l) => acc * (l.probabilityPct / 100), 1);
    coupons.push({
      id: "coupon-balanced-3",
      titleFr: `Combiné Équilibré · ${uniqueFixtureBalanced.length} sélections`,
      titleEn: `Balanced Multi-Market Combo · ${uniqueFixtureBalanced.length} legs`,
      profile: "balanced",
      riskLevel: joint >= 0.35 ? "medium" : "high",
      combinedProbabilityPct: Math.round(joint * 1000) / 10,
      combinedFairOdds: round2(1 / Math.max(0.01, joint)),
      legs: uniqueFixtureBalanced.map((l) => ({
        fixtureId: l.fixtureId,
        matchLabel: l.matchLabel,
        leagueName: l.leagueName,
        marketLabel: l.marketLabel,
        selectionLabel: l.selectionLabel,
        probabilityPct: l.probabilityPct,
      })),
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
    riskProfileFr: "Variance maîtrisée (1 à 2 % de bankroll)",
    riskProfileEn: "Controlled variance (1%–2% bankroll stake)",
    guidanceFr:
      "Privilégie les marchés 1X2 ou Double Chance lorsque la différence de probabilité estimée dépasse +15 pts sur des équipes à >= 6 matchs.",
    guidanceEn:
      "Focus on 1X2 or Double Chance when the estimated probability gap exceeds +15 pts across teams with >= 6 played fixtures.",
  },
  {
    id: "sports-combos",
    titleFr: "Paris combinés (2 à 3 sélections)",
    titleEn: "Combined Coupons (2–3 legs)",
    riskProfileFr: "Variance élevée (probabilité conjointe = produit)",
    riskProfileEn: "Higher variance (joint probability decays multiplicatively)",
    guidanceFr:
      "Chaque sélection ajoutée multiplie le risque d'échec global : limiter à 2-3 matchs indépendants sans gain assuré.",
    guidanceEn:
      "Each added leg multiplies failure risk; cap tickets to 2–3 independent fixtures with strict unit sizing.",
  },
  {
    id: "casino-rng",
    titleFr: "Jeux de hasard, Crash & Casino RNG",
    titleEn: "Casino RNG, Crash & Instant Games",
    riskProfileFr: "Avantage maison fixe (aucun historique prédictif)",
    riskProfileEn: "Fixed house edge (memoryless RNG draws)",
    guidanceFr:
      "Les tirages RNG et jeux Crash sont mathématiquement indépendants : aucune séquence passée n'influence le prochain tour ; fixez toujours un plafond strict de perte.",
    guidanceEn:
      "RNG draws and crash rounds are memoryless: past outcomes never predict the next round — always enforce a hard stop-loss budget.",
  },
];
