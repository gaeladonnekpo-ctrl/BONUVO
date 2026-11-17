import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });

async function main() {
  const { runIngestFixturesJob, runIngestStatsJob } =
    await import("@/modules/ai/service/ingestion-service");
  const { runComputePredictionsJob, runSettlePredictionsJob } =
    await import("@/modules/ai/service/prediction-service");

  const fixtures = await runIngestFixturesJob({ dbScope: "ai_pipeline", invalidateCache: false });
  console.log("FIXTURES:", fixtures);

  const stats = await runIngestStatsJob({ dbScope: "ai_pipeline", invalidateCache: false });
  console.log("STATS:", stats);

  const predictions = await runComputePredictionsJob({
    dbScope: "ai_pipeline",
    invalidateCache: false,
  });
  console.log("PREDICTIONS:", predictions);

  const settled = await runSettlePredictionsJob({ dbScope: "ai_pipeline", invalidateCache: false });
  console.log("SETTLED:", settled);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
