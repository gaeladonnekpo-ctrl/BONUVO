import { and, desc, eq, inArray } from "drizzle-orm";
import {
  computeCouponTrackRecordSummary,
  evaluateCouponLegFromFixture,
  type CouponTrackRecordSummary,
  type LegVerdict,
} from "@/modules/ai/model/coupon-settlement";
import { humanizeAnalysisText } from "@/modules/ai/service/ingestion-helpers";
import { reconcileDbSettlements } from "@/modules/ai/service/settlement-service";
import { withAppDb } from "@/server/db/context";
import {
  coupons,
  fixtures,
  leagues,
  predictionResults,
  predictions,
  teams,
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
  generationDateIso: string;
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

export interface WinningSingleTrackItem {
  id: string;
  fixtureId: string;
  generationDateIso: string;
  publishedAt: string | null;
  kickoffAt: string;
  matchLabel: string;
  leagueName: string;
  market: string;
  marketLabel: string;
  selectionLabel: string;
  probabilityPct: number;
  fairOdds: number;
  homeGoals: number | null;
  awayGoals: number | null;
  analysisText: string;
}

export interface PublicCouponTrackRecord {
  summary: CouponTrackRecordSummary;
  coupons: PublicCouponTrackItem[];
  winningSingles: WinningSingleTrackItem[];
  availableWinningDates: string[];
}

function formatGenerationDateIso(date: Date, tzOffsetMinutes = 60): string {
  const shifted = new Date(date.getTime() + tzOffsetMinutes * 60_000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function extractCouponGenerationDateIso(externalKey: string | null, fallbackDate: Date): string {
  if (externalKey) {
    const match = /^ai:(\d{4}-\d{2}-\d{2}):/.exec(externalKey);
    if (match?.[1]) return match[1];
  }
  return formatGenerationDateIso(fallbackDate, 60);
}

function formatSingleMarketSelection(
  market: string,
  selection: string,
  homeName: string,
  awayName: string,
): { marketLabel: string; selectionLabel: string } {
  if (market === "1x2") {
    return {
      marketLabel: "1X2",
      selectionLabel:
        selection === "home"
          ? `1 · ${homeName}`
          : selection === "away"
            ? `2 · ${awayName}`
            : "X · Match nul",
    };
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

let lastSettlementCheckMs = 0;

async function ensureSettlementsUpToDate(): Promise<void> {
  const nowMs = Date.now();
  if (nowMs - lastSettlementCheckMs < 20_000) return;
  lastSettlementCheckMs = nowMs;
  try {
    await withAppDb({ scope: "ai_pipeline" }, async (db) => {
      await reconcileDbSettlements(db, new Date(), null);
    });
  } catch {
    // Non-blocking: still return persisted history if pipeline check fails
  }
}

async function queryPublicCouponTrackRecordUncached(): Promise<PublicCouponTrackRecord> {
  await ensureSettlementsUpToDate();

  return withAppDb({ scope: "public_catalog" }, async (db) => {
    const [couponRows, wonSingleRows] = await Promise.all([
      db
        .select()
        .from(coupons)
        .where(eq(coupons.status, "validated"))
        .orderBy(desc(coupons.settledAt), desc(coupons.validatedAt), desc(coupons.createdAt))
        .limit(120),
      db
        .select({
          predictionId: predictions.id,
          fixtureId: fixtures.id,
          kickoffAt: fixtures.kickoffAt,
          homeGoals: fixtures.homeGoals,
          awayGoals: fixtures.awayGoals,
          homeTeamId: fixtures.homeTeamId,
          awayTeamId: fixtures.awayTeamId,
          leagueId: fixtures.leagueId,
          market: predictions.market,
          pickedSelection: predictions.pickedSelection,
          probabilitiesJson: predictions.probabilitiesJson,
          analysisText: predictions.analysisText,
          publishedAt: predictions.publishedAt,
          lockedAt: predictions.lockedAt,
        })
        .from(predictionResults)
        .innerJoin(predictions, eq(predictionResults.predictionId, predictions.id))
        .innerJoin(fixtures, eq(predictionResults.fixtureId, fixtures.id))
        .where(
          and(
            eq(predictionResults.verdict, "won"),
            eq(fixtures.fixtureStatus, "finished"),
            eq(predictions.status, "published"),
          ),
        )
        .orderBy(desc(fixtures.kickoffAt), desc(predictionResults.settledAt))
        .limit(250),
    ]);

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
    const singleTeamIds = Array.from(
      new Set(wonSingleRows.flatMap((s) => [s.homeTeamId, s.awayTeamId])),
    );
    const singleLeagueIds = Array.from(new Set(wonSingleRows.map((s) => s.leagueId)));

    const [fixtureRows, resultRows, teamRows, leagueRows] = await Promise.all([
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
      singleTeamIds.length > 0
        ? db
            .select({ id: teams.id, name: teams.name })
            .from(teams)
            .where(inArray(teams.id, singleTeamIds))
        : Promise.resolve([]),
      singleLeagueIds.length > 0
        ? db
            .select({ id: leagues.id, name: leagues.name })
            .from(leagues)
            .where(inArray(leagues.id, singleLeagueIds))
        : Promise.resolve([]),
    ]);

    const fixtureById = new Map(fixtureRows.map((f) => [f.id, f]));
    const verdictByPredictionId = new Map(resultRows.map((r) => [r.predictionId, r.verdict]));
    const teamById = new Map(teamRows.map((t) => [t.id, t.name]));
    const leagueById = new Map(leagueRows.map((l) => [l.id, l.name]));

    const items: PublicCouponTrackItem[] = couponRows.map((c) => {
      const rawLegs = Array.isArray(c.legsJson) ? c.legsJson : [];
      const legs: PublicCouponLegDetail[] = rawLegs.map((leg) => {
        const fix = fixtureById.get(leg.fixtureId);
        const storedVerdict = leg.predictionId
          ? (verdictByPredictionId.get(leg.predictionId) ?? null)
          : null;
        const verdict = fix
          ? evaluateCouponLegFromFixture({
              fixtureStatus: fix.fixtureStatus,
              homeGoals: fix.homeGoals,
              awayGoals: fix.awayGoals,
              market: leg.market,
              pickedSelection: leg.pickedSelection,
            })
          : evaluateCouponLegFromFixture({
              fixtureStatus: "scheduled",
              homeGoals: null,
              awayGoals: null,
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
      const generationDateIso = extractCouponGenerationDateIso(
        c.externalKey ?? null,
        c.validatedAt ?? c.createdAt,
      );

      return {
        id: c.id,
        generationDateIso,
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

    const winningSingles: WinningSingleTrackItem[] = wonSingleRows.map((row) => {
      const homeName = teamById.get(row.homeTeamId) ?? "Home";
      const awayName = teamById.get(row.awayTeamId) ?? "Away";
      const leagueName = leagueById.get(row.leagueId) ?? "Football";
      const prob = row.probabilitiesJson[row.pickedSelection] ?? 0.5;
      const probPct = Math.round(prob * 1000) / 10;
      const fairOdds = Math.round((1 / Math.max(0.05, prob)) * 100) / 100;
      const labels = formatSingleMarketSelection(
        row.market,
        row.pickedSelection,
        homeName,
        awayName,
      );
      return {
        id: row.predictionId,
        fixtureId: row.fixtureId,
        // Use the matchday date (kickoffAt in UTC+1) so today's settled winning matches appear under today's date
        generationDateIso: formatGenerationDateIso(row.kickoffAt, 60),
        publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
        kickoffAt: row.kickoffAt.toISOString(),
        matchLabel: `${homeName} vs ${awayName}`,
        leagueName,
        market: row.market,
        marketLabel: labels.marketLabel,
        selectionLabel: labels.selectionLabel,
        probabilityPct: probPct,
        fairOdds,
        homeGoals: row.homeGoals,
        awayGoals: row.awayGoals,
        analysisText: humanizeAnalysisText(row.analysisText),
      };
    });

    const availableWinningDates = Array.from(
      new Set([
        ...items.filter((c) => c.settlementStatus === "won").map((c) => c.generationDateIso),
        ...winningSingles.map((s) => s.generationDateIso),
      ]),
    ).sort((a, b) => b.localeCompare(a));

    const summary = computeCouponTrackRecordSummary(
      items.map((i) => ({
        settlementStatus: i.settlementStatus,
        combinedOdds: i.combinedOdds,
      })),
    );

    return {
      summary,
      coupons: items,
      winningSingles,
      availableWinningDates,
    };
  });
}

export async function getPublicCouponTrackRecord(): Promise<PublicCouponTrackRecord> {
  return queryPublicCouponTrackRecordUncached();
}
