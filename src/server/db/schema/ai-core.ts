import "server-only";

import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { TeamKeyPlayerStat, TeamRecentMatchStat } from "@/modules/ai/providers/types";

export const SPORTS_PROVIDER_STATUSES = ["active", "inactive"] as const;
export type SportsProviderStatus = (typeof SPORTS_PROVIDER_STATUSES)[number];

export const FIXTURE_STATUSES = [
  "scheduled",
  "live",
  "finished",
  "postponed",
  "cancelled",
  "abandoned",
] as const;
export type FixtureStatus = (typeof FIXTURE_STATUSES)[number];

export const INGESTION_JOB_NAMES = [
  "ingest-fixtures",
  "ingest-stats",
  "settle-predictions",
] as const;
export type IngestionJobName = (typeof INGESTION_JOB_NAMES)[number];

export const INGESTION_RUN_STATUSES = [
  "running",
  "completed",
  "partial_quota_stop",
  "failed",
] as const;
export type IngestionRunStatus = (typeof INGESTION_RUN_STATUSES)[number];

export const sportsProviders = pgTable(
  "sports_providers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    baseUrl: text("base_url").notNull(),
    dailyQuotaLimit: integer("daily_quota_limit").notNull().default(100),
    quotaReserve: integer("quota_reserve").notNull().default(10),
    active: boolean("active").notNull().default(true),
    status: text("status").$type<SportsProviderStatus>().notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    check("sports_providers_status_check", sql`${table.status} IN ('active', 'inactive')`),
    check(
      "sports_providers_quota_check",
      sql`${table.dailyQuotaLimit} > 0 AND ${table.quotaReserve} >= 0`,
    ),
  ],
);

export const ingestionRuns = pgTable(
  "ingestion_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => sportsProviders.id, { onDelete: "cascade" }),
    jobName: text("job_name").$type<IngestionJobName>().notNull(),
    status: text("status").$type<IngestionRunStatus>().notNull().default("running"),
    requestsMade: integer("requests_made").notNull().default(0),
    quotaRemaining: integer("quota_remaining"),
    itemsUpserted: integer("items_upserted").notNull().default(0),
    errorSummary: text("error_summary").notNull().default(""),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("ingestion_runs_job_started_idx").on(table.jobName, table.startedAt),
    check(
      "ingestion_runs_job_check",
      sql`${table.jobName} IN ('ingest-fixtures', 'ingest-stats', 'settle-predictions')`,
    ),
    check(
      "ingestion_runs_status_check",
      sql`${table.status} IN ('running', 'completed', 'partial_quota_stop', 'failed')`,
    ),
    check(
      "ingestion_runs_counts_check",
      sql`${table.requestsMade} >= 0 AND ${table.itemsUpserted} >= 0`,
    ),
  ],
);

export const leagues = pgTable(
  "leagues",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => sportsProviders.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    name: text("name").notNull(),
    countryName: text("country_name").notNull().default(""),
    logoUrl: text("logo_url").notNull().default(""),
    priorityOrder: integer("priority_order").notNull().default(100),
    tracked: boolean("tracked").notNull().default(false),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("leagues_provider_ext_uidx").on(table.providerId, table.externalId),
    index("leagues_tracked_idx").on(table.tracked, table.priorityOrder),
  ],
);

export const seasons = pgTable(
  "seasons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => sportsProviders.id, { onDelete: "cascade" }),
    leagueId: uuid("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    isCurrent: boolean("is_current").notNull().default(true),
    startDate: date("start_date", { mode: "string" }),
    endDate: date("end_date", { mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("seasons_league_year_uidx").on(table.leagueId, table.year)],
);

export const teams = pgTable(
  "teams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => sportsProviders.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    name: text("name").notNull(),
    shortCode: text("short_code").notNull().default(""),
    logoUrl: text("logo_url").notNull().default(""),
    countryName: text("country_name").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("teams_provider_ext_uidx").on(table.providerId, table.externalId)],
);

export const fixtures = pgTable(
  "fixtures",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => sportsProviders.id, { onDelete: "cascade" }),
    leagueId: uuid("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    homeTeamId: uuid("home_team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    awayTeamId: uuid("away_team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    kickoffAt: timestamp("kickoff_at", { withTimezone: true, mode: "date" }).notNull(),
    venueName: text("venue_name").notNull().default(""),
    roundLabel: text("round_label").notNull().default(""),
    fixtureStatus: text("fixture_status").$type<FixtureStatus>().notNull().default("scheduled"),
    homeGoals: integer("home_goals"),
    awayGoals: integer("away_goals"),
    lastIngestionRunId: uuid("last_ingestion_run_id").references(() => ingestionRuns.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("fixtures_provider_ext_uidx").on(table.providerId, table.externalId),
    index("fixtures_kickoff_idx").on(table.kickoffAt),
    index("fixtures_league_kickoff_idx").on(table.leagueId, table.kickoffAt),
    index("fixtures_status_idx").on(table.fixtureStatus, table.kickoffAt),
    check("fixtures_teams_diff_check", sql`${table.homeTeamId} <> ${table.awayTeamId}`),
    check(
      "fixtures_status_check",
      sql`${table.fixtureStatus} IN ('scheduled', 'live', 'finished', 'postponed', 'cancelled', 'abandoned')`,
    ),
    check(
      "fixtures_goals_nonneg_check",
      sql`(${table.homeGoals} IS NULL OR ${table.homeGoals} >= 0) AND (${table.awayGoals} IS NULL OR ${table.awayGoals} >= 0)`,
    ),
  ],
);

export const teamStatsSnapshots = pgTable(
  "team_stats_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    leagueId: uuid("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    ingestionRunId: uuid("ingestion_run_id")
      .notNull()
      .references(() => ingestionRuns.id, { onDelete: "restrict" }),
    asOfDate: date("as_of_date", { mode: "string" }).notNull(),
    matchesPlayed: integer("matches_played").notNull().default(0),
    homeMatchesPlayed: integer("home_matches_played").notNull().default(0),
    awayMatchesPlayed: integer("away_matches_played").notNull().default(0),
    goalsForTotal: integer("goals_for_total").notNull().default(0),
    goalsAgainstTotal: integer("goals_against_total").notNull().default(0),
    homeGoalsFor: integer("home_goals_for").notNull().default(0),
    homeGoalsAgainst: integer("home_goals_against").notNull().default(0),
    awayGoalsFor: integer("away_goals_for").notNull().default(0),
    awayGoalsAgainst: integer("away_goals_against").notNull().default(0),
    recentFormMatches: integer("recent_form_matches").notNull().default(0),
    recentFormPoints: integer("recent_form_points").notNull().default(0),
    recentGoalsFor: integer("recent_goals_for").notNull().default(0),
    recentGoalsAgainst: integer("recent_goals_against").notNull().default(0),
    keyPlayersJson: jsonb("key_players_json")
      .$type<TeamKeyPlayerStat[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    recentMatchesJson: jsonb("recent_matches_json")
      .$type<TeamRecentMatchStat[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    sourceTimestamp: timestamp("source_timestamp", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("team_stats_team_season_date_uidx").on(
      table.teamId,
      table.seasonId,
      table.asOfDate,
    ),
    index("team_stats_season_idx").on(table.leagueId, table.seasonId),
    check(
      "team_stats_nonneg_check",
      sql`${table.matchesPlayed} >= 0 AND ${table.homeMatchesPlayed} >= 0 AND ${table.awayMatchesPlayed} >= 0 AND ${table.goalsForTotal} >= 0 AND ${table.goalsAgainstTotal} >= 0`,
    ),
  ],
);
