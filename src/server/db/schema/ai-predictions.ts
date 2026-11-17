import "server-only";

import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { fixtures, ingestionRuns, leagues, seasons, teamStatsSnapshots, teams } from "./ai-core";
import { profiles } from "./auth";

export const PREDICTION_MARKETS = ["1x2", "over_under_25", "btts"] as const;
export type PredictionMarket = (typeof PREDICTION_MARKETS)[number];

export const CONFIDENCE_LEVELS = ["low", "medium", "high"] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export const PREDICTION_STATUSES = ["pending", "published", "unpublished", "void"] as const;
export type PredictionStatus = (typeof PREDICTION_STATUSES)[number];

export const PREDICTION_VERDICTS = ["won", "lost", "void"] as const;
export type PredictionVerdict = (typeof PREDICTION_VERDICTS)[number];

export const ANALYSIS_STATUSES = ["none", "template", "llm_verified"] as const;
export type AnalysisStatus = (typeof ANALYSIS_STATUSES)[number];

export const modelVersions = pgTable(
  "model_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    versionTag: text("version_tag").notNull().unique(),
    description: text("description").notNull().default(""),
    parametersJson: jsonb("parameters_json")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    active: boolean("active").notNull().default(true),
    activatedAt: timestamp("activated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("model_versions_active_idx").on(table.active)],
);

export const predictions = pgTable(
  "predictions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fixtureId: uuid("fixture_id")
      .notNull()
      .references(() => fixtures.id, { onDelete: "cascade" }),
    modelVersionId: uuid("model_version_id")
      .notNull()
      .references(() => modelVersions.id, { onDelete: "restrict" }),
    market: text("market").$type<PredictionMarket>().notNull(),
    probabilitiesJson: jsonb("probabilities_json").$type<Record<string, number>>().notNull(),
    pickedSelection: text("picked_selection").notNull(),
    confidenceLevel: text("confidence_level").$type<ConfidenceLevel>().notNull(),
    confidenceScore: numeric("confidence_score", { precision: 5, scale: 4 }).notNull(),
    expectedHomeGoals: numeric("expected_home_goals", { precision: 5, scale: 3 }).notNull(),
    expectedAwayGoals: numeric("expected_away_goals", { precision: 5, scale: 3 }).notNull(),
    inputSnapshotHash: text("input_snapshot_hash").notNull(),
    homeStatsSnapshotId: uuid("home_stats_snapshot_id").references(() => teamStatsSnapshots.id, {
      onDelete: "restrict",
    }),
    awayStatsSnapshotId: uuid("away_stats_snapshot_id").references(() => teamStatsSnapshots.id, {
      onDelete: "restrict",
    }),
    analysisText: text("analysis_text").notNull().default(""),
    analysisStatus: text("analysis_status").$type<AnalysisStatus>().notNull().default("template"),
    status: text("status").$type<PredictionStatus>().notNull().default("published"),
    couponValidated: boolean("coupon_validated").notNull().default(false),
    validatedBy: uuid("validated_by").references(() => profiles.id, { onDelete: "set null" }),
    validatedAt: timestamp("validated_at", { withTimezone: true, mode: "date" }),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "date" }),
    lockedAt: timestamp("locked_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("predictions_fixture_market_model_uidx").on(
      table.fixtureId,
      table.market,
      table.modelVersionId,
    ),
    index("predictions_status_pub_idx").on(table.status, table.publishedAt),
    index("predictions_locked_idx").on(table.lockedAt),
    check("predictions_market_check", sql`${table.market} IN ('1x2', 'over_under_25', 'btts')`),
    check(
      "predictions_confidence_check",
      sql`${table.confidenceLevel} IN ('low', 'medium', 'high')`,
    ),
    check(
      "predictions_status_check",
      sql`${table.status} IN ('pending', 'published', 'unpublished', 'void')`,
    ),
    check(
      "predictions_analysis_status_check",
      sql`${table.analysisStatus} IN ('none', 'template', 'llm_verified')`,
    ),
    check(
      "predictions_score_bounds_check",
      sql`${table.confidenceScore} >= 0 AND ${table.confidenceScore} <= 1`,
    ),
  ],
);

export const predictionResults = pgTable(
  "prediction_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    predictionId: uuid("prediction_id")
      .notNull()
      .unique()
      .references(() => predictions.id, { onDelete: "restrict" }),
    fixtureId: uuid("fixture_id")
      .notNull()
      .references(() => fixtures.id, { onDelete: "cascade" }),
    actualOutcome: text("actual_outcome").notNull().default(""),
    verdict: text("verdict").$type<PredictionVerdict>().notNull(),
    brierScore: numeric("brier_score", { precision: 6, scale: 4 }),
    settledAt: timestamp("settled_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    ingestionRunId: uuid("ingestion_run_id").references(() => ingestionRuns.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("prediction_results_verdict_settled_idx").on(table.verdict, table.settledAt),
    index("prediction_results_fixture_idx").on(table.fixtureId),
    check("prediction_results_verdict_check", sql`${table.verdict} IN ('won', 'lost', 'void')`),
    check(
      "prediction_results_brier_check",
      sql`${table.brierScore} IS NULL OR (${table.brierScore} >= 0 AND ${table.brierScore} <= 2)`,
    ),
  ],
);

export const standings = pgTable(
  "standings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leagueId: uuid("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    ingestionRunId: uuid("ingestion_run_id")
      .notNull()
      .references(() => ingestionRuns.id, { onDelete: "restrict" }),
    rank: integer("rank").notNull(),
    points: integer("points").notNull().default(0),
    played: integer("played").notNull().default(0),
    wins: integer("wins").notNull().default(0),
    draws: integer("draws").notNull().default(0),
    losses: integer("losses").notNull().default(0),
    goalsFor: integer("goals_for").notNull().default(0),
    goalsAgainst: integer("goals_against").notNull().default(0),
    goalDiff: integer("goal_diff").notNull().default(0),
    formText: text("form_text").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("standings_league_season_team_uidx").on(
      table.leagueId,
      table.seasonId,
      table.teamId,
    ),
    index("standings_rank_idx").on(table.leagueId, table.seasonId, table.rank),
  ],
);
