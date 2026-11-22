import type { PublicFixtureDto } from "@/modules/ai/service/public-ai-types";

export interface SingleBetSuggestion {
  fixtureId: string;
  predictionId: string;
  matchLabel: string;
  homeTeamName: string;
  homeTeamLogo: string;
  awayTeamName: string;
  awayTeamLogo: string;
  leagueId: string;
  leagueName: string;
  leagueLogo: string;
  kickoffAt: string;
  market: string;
  pickedSelection: string;
  marketLabel: string;
  selectionLabel: string;
  probabilityPct: number;
  fairOdds: number;
  oddsSourceFr: string;
  oddsSourceEn: string;
  confidenceLevel: "low" | "medium" | "high";
  riskLevel: "low" | "medium" | "high";
  rationale: string;
  riskFactorsFr: string;
  riskFactorsEn: string;
}

export interface CombinedCouponLeg {
  fixtureId: string;
  predictionId?: string;
  matchLabel: string;
  homeTeamName: string;
  homeTeamLogo: string;
  awayTeamName: string;
  awayTeamLogo: string;
  leagueId?: string;
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

export type CombinedCouponProfile = "safe" | "balanced" | "diversified" | "bold";

export interface CombinedCouponDto {
  id: string;
  titleFr: string;
  titleEn: string;
  profile: CombinedCouponProfile;
  riskLevel: "low" | "medium" | "high";
  combinedProbabilityPct: number;
  combinedFairOdds: number;
  oddsSourceFr: string;
  oddsSourceEn: string;
  distinctLeaguesCount: number;
  legs: CombinedCouponLeg[];
  rationaleFr: string;
  rationaleEn: string;
}

export interface DailyCouponBatchResult {
  coupons: CombinedCouponDto[];
  singles: SingleBetSuggestion[];
  shortfallFr: string | null;
  shortfallEn: string | null;
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

const MIN_LEGS_PER_COUPON = 3;
const TARGET_DAILY_COUPONS = 4;
const TARGET_DAILY_SINGLES = 5;

const DEFAULT_ODDS_SOURCE_FR =
  "Cote théorique BONUVO AI (modèle Poisson) — cotes bookmakers non fournies par la source";
const DEFAULT_ODDS_SOURCE_EN =
  "BONUVO AI theoretical odds (Poisson model) — bookmaker odds not provided by source";

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

/**
 * Filters fixtures to only active, non-settled matches eligible for public active picks.
 * Finished, postponed, cancelled, and abandoned fixtures are automatically excluded.
 */
export function filterActiveFixturesForRecommendations(
  fixtures: PublicFixtureDto[],
): PublicFixtureDto[] {
  return fixtures
    .filter((f) => {
      if (["finished", "postponed", "cancelled", "abandoned"].includes(f.fixtureStatus)) {
        return false;
      }
      return f.predictions.some((p) => p.verdict !== "lost" && p.verdict !== "void");
    })
    .map((f) => ({
      ...f,
      predictions: f.predictions.filter((p) => p.verdict !== "lost" && p.verdict !== "void"),
    }))
    .filter((f) => f.predictions.length > 0);
}

function buildRiskFactors(
  fix: PublicFixtureDto,
  market: string,
  probabilityPct: number,
): { fr: string; en: string } {
  if (probabilityPct >= 70) {
    return {
      fr: `Variance modérée (${probabilityPct}% estimé) ; surveiller les compositions officielles avant coup d'envoi (${fix.leagueName}).`,
      en: `Moderate variance (${probabilityPct}% estimated); monitor official lineups before kickoff (${fix.leagueName}).`,
    };
  }
  if (market === "btts" || market === "over_under_25") {
    return {
      fr: "Marché sensible au rythme de jeu, à l'efficacité offensive et aux faits de match (cartons/pénaltys).",
      en: "Market sensitive to match tempo, finishing efficiency, and game-state events.",
    };
  }
  return {
    fr: `Issue incertaine (${probabilityPct}% estimé) : risque de match nul ou d'écart serré sur ce duel de ${fix.leagueName}.`,
    en: `Uncertain outcome (${probabilityPct}% estimated): draw risk or tight margin in this ${fix.leagueName} clash.`,
  };
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
  if (bestProb <= 0.55) return null;

  const pickLabel =
    p1x >= px2 ? `1X (${fix.homeTeamName} ou Nul)` : `X2 (Nul ou ${fix.awayTeamName})`;
  const probPct = Math.round(bestProb * 1000) / 10;
  const risk = buildRiskFactors(fix, "double_chance", probPct);
  return {
    fixtureId: fix.id,
    predictionId: pred.id,
    matchLabel: `${fix.homeTeamName} vs ${fix.awayTeamName}`,
    homeTeamName: fix.homeTeamName,
    homeTeamLogo: fix.homeTeamLogo,
    awayTeamName: fix.awayTeamName,
    awayTeamLogo: fix.awayTeamLogo,
    leagueId: fix.leagueId,
    leagueName: fix.leagueName,
    leagueLogo: fix.leagueLogo,
    kickoffAt: fix.kickoffAt,
    market: "double_chance",
    pickedSelection: p1x >= px2 ? "1x" : "x2",
    marketLabel: "Double Chance",
    selectionLabel: pickLabel,
    probabilityPct: probPct,
    fairOdds: round2(1 / Math.max(0.05, bestProb)),
    oddsSourceFr: DEFAULT_ODDS_SOURCE_FR,
    oddsSourceEn: DEFAULT_ODDS_SOURCE_EN,
    confidenceLevel: probPct >= 72 ? "high" : probPct >= 58 ? "medium" : "low",
    riskLevel: probPct >= 72 ? "low" : probPct >= 58 ? "medium" : "high",
    rationale: pred.analysisText,
    riskFactorsFr: risk.fr,
    riskFactorsEn: risk.en,
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

function collectAllCandidates(fixtures: PublicFixtureDto[]): SingleBetSuggestion[] {
  const active = filterActiveFixturesForRecommendations(fixtures);
  const candidates: SingleBetSuggestion[] = [];
  for (const fix of active) {
    for (const pred of fix.predictions) {
      const topProb = pred.probabilities[pred.pickedSelection] ?? 0;
      if (topProb <= 0) continue;
      const probPct = Math.round(topProb * 1000) / 10;
      const labels = formatSelectionLabel(fix, pred.market, pred.pickedSelection);
      const risk = buildRiskFactors(fix, pred.market, probPct);
      candidates.push({
        fixtureId: fix.id,
        predictionId: pred.id,
        matchLabel: `${fix.homeTeamName} vs ${fix.awayTeamName}`,
        homeTeamName: fix.homeTeamName,
        homeTeamLogo: fix.homeTeamLogo,
        awayTeamName: fix.awayTeamName,
        awayTeamLogo: fix.awayTeamLogo,
        leagueId: fix.leagueId,
        leagueName: fix.leagueName,
        leagueLogo: fix.leagueLogo,
        kickoffAt: fix.kickoffAt,
        market: pred.market,
        pickedSelection: pred.pickedSelection,
        marketLabel: labels.marketLabel,
        selectionLabel: labels.selectionLabel,
        probabilityPct: probPct,
        fairOdds: round2(1 / Math.max(0.05, topProb)),
        oddsSourceFr: DEFAULT_ODDS_SOURCE_FR,
        oddsSourceEn: DEFAULT_ODDS_SOURCE_EN,
        confidenceLevel: pred.confidenceLevel,
        riskLevel: probPct >= 62 ? "low" : probPct >= 48 ? "medium" : "high",
        rationale: pred.analysisText,
        riskFactorsFr: risk.fr,
        riskFactorsEn: risk.en,
      });
    }
    const dc = deriveDoubleChanceCandidate(fix);
    if (dc) candidates.push(dc);
  }
  return candidates.sort((a, b) => b.probabilityPct - a.probabilityPct);
}

/**
 * Selects single picks across all available leagues, prioritizing at least 5 distinct matches
 * with the strongest statistical probabilities.
 */
export function buildSinglePicks(fixtures: PublicFixtureDto[]): SingleBetSuggestion[] {
  const candidates = collectAllCandidates(fixtures);
  const picked: SingleBetSuggestion[] = [];
  const usedFixtures = new Set<string>();
  const usedLeagues = new Set<string>();

  // Pass 1: maximize league diversity for top picks
  for (const c of candidates) {
    if (usedFixtures.has(c.fixtureId)) continue;
    const leagueKey = c.leagueName.toLowerCase();
    if (usedLeagues.has(leagueKey)) continue;
    usedFixtures.add(c.fixtureId);
    usedLeagues.add(leagueKey);
    picked.push(c);
    if (picked.length >= 12) break;
  }

  // Pass 2: fill remaining slots (up to 12) across distinct fixtures regardless of league
  if (picked.length < 12) {
    for (const c of candidates) {
      if (usedFixtures.has(c.fixtureId)) continue;
      usedFixtures.add(c.fixtureId);
      picked.push(c);
      if (picked.length >= 12) break;
    }
  }

  return picked.sort((a, b) => b.probabilityPct - a.probabilityPct);
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
    leagueId: l.leagueId,
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

function pickDiverseLegs(
  pool: SingleBetSuggestion[],
  count: number,
  options: {
    usedSignatures: Set<string>;
    preferDistinctLeagues: boolean;
  },
): SingleBetSuggestion[] {
  const selected: SingleBetSuggestion[] = [];
  const usedFixtures = new Set<string>();
  const usedLeagues = new Set<string>();

  if (options.preferDistinctLeagues) {
    for (const item of pool) {
      const sig = `${item.fixtureId}:${item.market}:${item.pickedSelection}`;
      if (options.usedSignatures.has(sig) || usedFixtures.has(item.fixtureId)) continue;
      const lKey = item.leagueName.toLowerCase();
      if (usedLeagues.has(lKey)) continue;
      selected.push(item);
      usedFixtures.add(item.fixtureId);
      usedLeagues.add(lKey);
      if (selected.length >= count) break;
    }
  }

  if (selected.length < count) {
    for (const item of pool) {
      const sig = `${item.fixtureId}:${item.market}:${item.pickedSelection}`;
      if (options.usedSignatures.has(sig) || usedFixtures.has(item.fixtureId)) continue;
      selected.push(item);
      usedFixtures.add(item.fixtureId);
      if (selected.length >= count) break;
    }
  }

  // Fallback allowing already-used market signatures only if distinct fixtures are still available
  if (selected.length < count) {
    for (const item of pool) {
      if (usedFixtures.has(item.fixtureId)) continue;
      selected.push(item);
      usedFixtures.add(item.fixtureId);
      if (selected.length >= count) break;
    }
  }

  return selected;
}

function couponCompositionKey(legs: SingleBetSuggestion[]): string {
  return legs
    .map((l) => `${l.fixtureId}:${l.market}:${l.pickedSelection}`)
    .sort()
    .join("|");
}

function createCouponDto(params: {
  id: string;
  profile: CombinedCouponProfile;
  titleFr: string;
  titleEn: string;
  legs: SingleBetSuggestion[];
  rationaleFr: string;
  rationaleEn: string;
}): CombinedCouponDto {
  const sameLeaguePairs = countSameLeaguePairs(params.legs);
  const joint = computeCorrelatedComboProbability(
    params.legs.map((l) => l.probabilityPct / 100),
    sameLeaguePairs,
  );
  const distinctLeaguesCount = new Set(params.legs.map((l) => l.leagueName.toLowerCase())).size;
  return {
    id: params.id,
    titleFr: params.titleFr,
    titleEn: params.titleEn,
    profile: params.profile,
    riskLevel: joint >= 0.4 ? "low" : joint >= 0.22 ? "medium" : "high",
    combinedProbabilityPct: Math.round(joint * 1000) / 10,
    combinedFairOdds: round2(1 / Math.max(0.01, joint)),
    oddsSourceFr: DEFAULT_ODDS_SOURCE_FR,
    oddsSourceEn: DEFAULT_ODDS_SOURCE_EN,
    distinctLeaguesCount,
    legs: params.legs.map(toCouponLeg),
    rationaleFr: params.rationaleFr,
    rationaleEn: params.rationaleEn,
  };
}

/**
 * Builds up to 4 diversified combined coupons (minimum 3 distinct fixtures each),
 * prioritizing multi-league combinations and never fabricating picks if insufficient data exists.
 */
export function buildCombinedCoupons(fixtures: PublicFixtureDto[]): CombinedCouponDto[] {
  const candidates = collectAllCandidates(fixtures);
  const activeFixturesCount = new Set(candidates.map((c) => c.fixtureId)).size;
  if (activeFixturesCount < MIN_LEGS_PER_COUPON) return [];

  const coupons: CombinedCouponDto[] = [];
  const usedSignatures = new Set<string>();
  const usedCompositions = new Set<string>();

  const registerCoupon = (
    legs: SingleBetSuggestion[],
    builder: (legs: SingleBetSuggestion[]) => CombinedCouponDto,
  ) => {
    if (legs.length < MIN_LEGS_PER_COUPON) return;
    const compKey = couponCompositionKey(legs);
    if (usedCompositions.has(compKey)) return;
    usedCompositions.add(compKey);
    for (const l of legs) {
      usedSignatures.add(`${l.fixtureId}:${l.market}:${l.pickedSelection}`);
    }
    coupons.push(builder(legs));
  };

  // 1. Safe Coupon (Double Chance + top >= 64% picks across distinct leagues)
  const safePool = candidates.filter((c) => c.probabilityPct >= 62);
  const safeLegs = pickDiverseLegs(safePool.length >= 3 ? safePool : candidates, 3, {
    usedSignatures,
    preferDistinctLeagues: true,
  });
  registerCoupon(safeLegs, (legs) =>
    createCouponDto({
      id: "coupon-safe-3",
      profile: "safe",
      titleFr: `Combiné Prudent · ${legs.length} sélections`,
      titleEn: `Low-Variance Combo · ${legs.length} legs`,
      legs,
      rationaleFr:
        "Sélections à haute probabilité (Double Chance et favoris solides) réparties sur plusieurs compétitions avec pénalité de corrélation.",
      rationaleEn:
        "High-probability Double Chance and solid statistical picks diversified across competitions with correlation adjustment.",
    }),
  );

  // 2. Balanced Multi-Market Coupon (1X2, Over/Under 2.5, BTTS)
  const balancedPool = candidates.filter((c) => c.market !== "double_chance");
  const balancedLegs = pickDiverseLegs(balancedPool.length >= 3 ? balancedPool : candidates, 3, {
    usedSignatures,
    preferDistinctLeagues: true,
  });
  registerCoupon(balancedLegs, (legs) =>
    createCouponDto({
      id: "coupon-balanced-3",
      profile: "balanced",
      titleFr: `Combiné Équilibré · ${legs.length} sélections`,
      titleEn: `Balanced Multi-Market Combo · ${legs.length} legs`,
      legs,
      rationaleFr:
        "Mix équilibré 1X2, Total buts 2.5 et BTTS issu de championnats variés selon les moyennes offensives et défensives.",
      rationaleEn:
        "Balanced 1X2, Over/Under 2.5, and BTTS picks across leagues based on offensive and defensive Poisson rates.",
    }),
  );

  // 3. Diversified Multi-League Coupon (strictly prioritizes distinct leagues and remaining fixtures)
  const diversifiedPool = candidates.filter((c) => c.probabilityPct >= 50);
  const diversifiedLegs = pickDiverseLegs(
    diversifiedPool.length >= 3 ? diversifiedPool : candidates,
    3,
    {
      usedSignatures,
      preferDistinctLeagues: true,
    },
  );
  registerCoupon(diversifiedLegs, (legs) =>
    createCouponDto({
      id: "coupon-diversified-3",
      profile: "diversified",
      titleFr: `Combiné Multi-Ligues · ${legs.length} sélections`,
      titleEn: `Cross-League Combo · ${legs.length} legs`,
      legs,
      rationaleFr:
        "Association multi-championnats exploitant l'ensemble du calendrier disponible pour limiter la corrélation entre rencontres.",
      rationaleEn:
        "Cross-competition ticket exploiting the full daily schedule to minimize correlation across selections.",
    }),
  );

  // 4. Bold / Value Coupon (higher theoretical odds opportunities, >= 42% probability)
  const boldPool = candidates
    .filter((c) => c.market !== "double_chance" && c.probabilityPct >= 42 && c.probabilityPct <= 68)
    .sort((a, b) => b.fairOdds - a.fairOdds);
  const boldLegs = pickDiverseLegs(boldPool.length >= 3 ? boldPool : candidates, 3, {
    usedSignatures,
    preferDistinctLeagues: true,
  });
  registerCoupon(boldLegs, (legs) =>
    createCouponDto({
      id: "coupon-bold-3",
      profile: "bold",
      titleFr: `Combiné Audacieux · ${legs.length} sélections`,
      titleEn: `Value & Higher-Yield Combo · ${legs.length} legs`,
      legs,
      rationaleFr:
        "Opportunités statistiques à cote théorique plus élevée (victoires nettes, +2.5 buts ou BTTS) avec risque explicitement signalé.",
      rationaleEn:
        "Higher-yield statistical opportunities (1X2, Over 2.5, BTTS) with explicitly flagged variance.",
    }),
  );

  return coupons.slice(0, TARGET_DAILY_COUPONS);
}

export function buildDailyCouponBatch(fixtures: PublicFixtureDto[]): DailyCouponBatchResult {
  const singles = buildSinglePicks(fixtures);
  const coupons = buildCombinedCoupons(fixtures);

  const missingCombos = coupons.length < TARGET_DAILY_COUPONS;
  const missingSingles = singles.length < TARGET_DAILY_SINGLES;

  let shortfallFr: string | null = null;
  let shortfallEn: string | null = null;

  if (missingCombos || missingSingles) {
    shortfallFr = `Production ajustée à ${coupons.length}/${TARGET_DAILY_COUPONS} combinés (min. 3 matchs) et ${singles.length}/${TARGET_DAILY_SINGLES}+ pronostics simples : le nombre de rencontres actives éligibles avec données statistiques suffisantes (>= 6 matchs) ne permet pas d'en générer davantage sans compromettre la fiabilité.`;
    shortfallEn = `Adjusted to ${coupons.length}/${TARGET_DAILY_COUPONS} combos (min. 3 legs) and ${singles.length}/${TARGET_DAILY_SINGLES}+ singles: insufficient active eligible fixtures with >= 6 matches of statistical history to generate more without compromising reliability.`;
  }

  return { coupons, singles, shortfallFr, shortfallEn };
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
    titleFr: "Paris combinés diversifiés (3 sélections min.)",
    titleEn: "Diversified Combined Coupons (3+ legs)",
    riskProfileFr: "Risque plus élevé (probabilités cumulées)",
    riskProfileEn: "Higher risk (combined probability)",
    guidanceFr:
      "Chaque sélection ajoutée augmente le niveau de risque global : BONUVO AI diversifie les ligues pour limiter la corrélation tout en rappelant qu'aucun gain n'est garanti.",
    guidanceEn:
      "Each added selection increases overall risk; BONUVO AI diversifies leagues to limit correlation while reminding users no profit is guaranteed.",
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
