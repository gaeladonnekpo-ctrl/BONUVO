import { eq } from "drizzle-orm";
import { computeAccuracySummary, type SettledRecordForSummary } from "@/modules/ai/model/settle";
import { PUBLIC_CATALOG_CACHE_TAGS, withCatalogCache } from "@/server/cache/catalog-tags";
import { withAppDb } from "@/server/db/context";
import { modelVersions, predictionResults, predictions } from "@/server/db/schema";

export async function getPublicPredictionStats() {
  const cached = withCatalogCache(
    async () => {
      return withAppDb({ scope: "public_catalog" }, async (db) => {
        const rows = await db
          .select({
            verdict: predictionResults.verdict,
            brierScore: predictionResults.brierScore,
            market: predictions.market,
            settledAt: predictionResults.settledAt,
            versionTag: modelVersions.versionTag,
          })
          .from(predictionResults)
          .innerJoin(predictions, eq(predictionResults.predictionId, predictions.id))
          .innerJoin(modelVersions, eq(predictions.modelVersionId, modelVersions.id))
          .orderBy(predictionResults.settledAt)
          .limit(500);

        const records: SettledRecordForSummary[] = rows.map((r) => ({
          verdict: r.verdict,
          brierScore: r.brierScore !== null ? Number(r.brierScore) : null,
          market: r.market,
        }));

        const overall = computeAccuracySummary(records);
        const byMarket = {
          "1x2": computeAccuracySummary(records.filter((r) => r.market === "1x2")),
          over_under_25: computeAccuracySummary(
            records.filter((r) => r.market === "over_under_25"),
          ),
          btts: computeAccuracySummary(records.filter((r) => r.market === "btts")),
        };

        const timelineMap = new Map<string, { won: number; lost: number; date: string }>();
        for (const r of rows) {
          if (r.verdict === "void") continue;
          const dateKey = r.settledAt.toISOString().slice(0, 10);
          const cur = timelineMap.get(dateKey) ?? { won: 0, lost: 0, date: dateKey };
          if (r.verdict === "won") cur.won += 1;
          else cur.lost += 1;
          timelineMap.set(dateKey, cur);
        }

        const timeline = Array.from(timelineMap.values()).map((pt) => {
          const decided = pt.won + pt.lost;
          return {
            date: pt.date,
            won: pt.won,
            lost: pt.lost,
            winRatePct: decided > 0 ? Math.round((pt.won / decided) * 1000) / 10 : 0,
          };
        });

        return {
          overall,
          byMarket,
          timeline,
          modelVersion: rows[0]?.versionTag ?? "poisson-v1.0",
        };
      });
    },
    ["ai-prediction-stats"],
    [PUBLIC_CATALOG_CACHE_TAGS.predictions],
  );
  return cached();
}
