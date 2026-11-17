CREATE TABLE "fixtures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"league_id" uuid NOT NULL,
	"season_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"home_team_id" uuid NOT NULL,
	"away_team_id" uuid NOT NULL,
	"kickoff_at" timestamp with time zone NOT NULL,
	"venue_name" text DEFAULT '' NOT NULL,
	"round_label" text DEFAULT '' NOT NULL,
	"fixture_status" text DEFAULT 'scheduled' NOT NULL,
	"home_goals" integer,
	"away_goals" integer,
	"last_ingestion_run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fixtures_teams_diff_check" CHECK ("fixtures"."home_team_id" <> "fixtures"."away_team_id"),
	CONSTRAINT "fixtures_status_check" CHECK ("fixtures"."fixture_status" IN ('scheduled', 'live', 'finished', 'postponed', 'cancelled', 'abandoned')),
	CONSTRAINT "fixtures_goals_nonneg_check" CHECK (("fixtures"."home_goals" IS NULL OR "fixtures"."home_goals" >= 0) AND ("fixtures"."away_goals" IS NULL OR "fixtures"."away_goals" >= 0))
);
--> statement-breakpoint
CREATE TABLE "ingestion_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"job_name" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"requests_made" integer DEFAULT 0 NOT NULL,
	"quota_remaining" integer,
	"items_upserted" integer DEFAULT 0 NOT NULL,
	"error_summary" text DEFAULT '' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ingestion_runs_job_check" CHECK ("ingestion_runs"."job_name" IN ('ingest-fixtures', 'ingest-stats', 'settle-predictions')),
	CONSTRAINT "ingestion_runs_status_check" CHECK ("ingestion_runs"."status" IN ('running', 'completed', 'partial_quota_stop', 'failed')),
	CONSTRAINT "ingestion_runs_counts_check" CHECK ("ingestion_runs"."requests_made" >= 0 AND "ingestion_runs"."items_upserted" >= 0)
);
--> statement-breakpoint
CREATE TABLE "leagues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"country_name" text DEFAULT '' NOT NULL,
	"logo_url" text DEFAULT '' NOT NULL,
	"priority_order" integer DEFAULT 100 NOT NULL,
	"tracked" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"league_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"start_date" date,
	"end_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sports_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"base_url" text NOT NULL,
	"daily_quota_limit" integer DEFAULT 100 NOT NULL,
	"quota_reserve" integer DEFAULT 10 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sports_providers_slug_unique" UNIQUE("slug"),
	CONSTRAINT "sports_providers_status_check" CHECK ("sports_providers"."status" IN ('active', 'inactive')),
	CONSTRAINT "sports_providers_quota_check" CHECK ("sports_providers"."daily_quota_limit" > 0 AND "sports_providers"."quota_reserve" >= 0)
);
--> statement-breakpoint
CREATE TABLE "standings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" uuid NOT NULL,
	"season_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"ingestion_run_id" uuid NOT NULL,
	"rank" integer NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"played" integer DEFAULT 0 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"draws" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"goals_for" integer DEFAULT 0 NOT NULL,
	"goals_against" integer DEFAULT 0 NOT NULL,
	"goal_diff" integer DEFAULT 0 NOT NULL,
	"form_text" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_stats_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"league_id" uuid NOT NULL,
	"season_id" uuid NOT NULL,
	"ingestion_run_id" uuid NOT NULL,
	"as_of_date" date NOT NULL,
	"matches_played" integer DEFAULT 0 NOT NULL,
	"home_matches_played" integer DEFAULT 0 NOT NULL,
	"away_matches_played" integer DEFAULT 0 NOT NULL,
	"goals_for_total" integer DEFAULT 0 NOT NULL,
	"goals_against_total" integer DEFAULT 0 NOT NULL,
	"home_goals_for" integer DEFAULT 0 NOT NULL,
	"home_goals_against" integer DEFAULT 0 NOT NULL,
	"away_goals_for" integer DEFAULT 0 NOT NULL,
	"away_goals_against" integer DEFAULT 0 NOT NULL,
	"recent_form_matches" integer DEFAULT 0 NOT NULL,
	"recent_form_points" integer DEFAULT 0 NOT NULL,
	"recent_goals_for" integer DEFAULT 0 NOT NULL,
	"recent_goals_against" integer DEFAULT 0 NOT NULL,
	"source_timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_stats_nonneg_check" CHECK ("team_stats_snapshots"."matches_played" >= 0 AND "team_stats_snapshots"."home_matches_played" >= 0 AND "team_stats_snapshots"."away_matches_played" >= 0 AND "team_stats_snapshots"."goals_for_total" >= 0 AND "team_stats_snapshots"."goals_against_total" >= 0)
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"short_code" text DEFAULT '' NOT NULL,
	"logo_url" text DEFAULT '' NOT NULL,
	"country_name" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_tag" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"parameters_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"activated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "model_versions_version_tag_unique" UNIQUE("version_tag")
);
--> statement-breakpoint
CREATE TABLE "prediction_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prediction_id" uuid NOT NULL,
	"fixture_id" uuid NOT NULL,
	"actual_outcome" text DEFAULT '' NOT NULL,
	"verdict" text NOT NULL,
	"brier_score" numeric(6, 4),
	"settled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ingestion_run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prediction_results_prediction_id_unique" UNIQUE("prediction_id"),
	CONSTRAINT "prediction_results_verdict_check" CHECK ("prediction_results"."verdict" IN ('won', 'lost', 'void')),
	CONSTRAINT "prediction_results_brier_check" CHECK ("prediction_results"."brier_score" IS NULL OR ("prediction_results"."brier_score" >= 0 AND "prediction_results"."brier_score" <= 2))
);
--> statement-breakpoint
CREATE TABLE "predictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fixture_id" uuid NOT NULL,
	"model_version_id" uuid NOT NULL,
	"market" text NOT NULL,
	"probabilities_json" jsonb NOT NULL,
	"picked_selection" text NOT NULL,
	"confidence_level" text NOT NULL,
	"confidence_score" numeric(5, 4) NOT NULL,
	"expected_home_goals" numeric(5, 3) NOT NULL,
	"expected_away_goals" numeric(5, 3) NOT NULL,
	"input_snapshot_hash" text NOT NULL,
	"home_stats_snapshot_id" uuid,
	"away_stats_snapshot_id" uuid,
	"analysis_text" text DEFAULT '' NOT NULL,
	"analysis_status" text DEFAULT 'template' NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"coupon_validated" boolean DEFAULT false NOT NULL,
	"validated_by" uuid,
	"validated_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"locked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "predictions_market_check" CHECK ("predictions"."market" IN ('1x2', 'over_under_25', 'btts')),
	CONSTRAINT "predictions_confidence_check" CHECK ("predictions"."confidence_level" IN ('low', 'medium', 'high')),
	CONSTRAINT "predictions_status_check" CHECK ("predictions"."status" IN ('pending', 'published', 'unpublished', 'void')),
	CONSTRAINT "predictions_analysis_status_check" CHECK ("predictions"."analysis_status" IN ('none', 'template', 'llm_verified')),
	CONSTRAINT "predictions_score_bounds_check" CHECK ("predictions"."confidence_score" >= 0 AND "predictions"."confidence_score" <= 1)
);
--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_provider_id_sports_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."sports_providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_last_ingestion_run_id_ingestion_runs_id_fk" FOREIGN KEY ("last_ingestion_run_id") REFERENCES "public"."ingestion_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_runs" ADD CONSTRAINT "ingestion_runs_provider_id_sports_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."sports_providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leagues" ADD CONSTRAINT "leagues_provider_id_sports_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."sports_providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_provider_id_sports_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."sports_providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standings" ADD CONSTRAINT "standings_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standings" ADD CONSTRAINT "standings_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standings" ADD CONSTRAINT "standings_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standings" ADD CONSTRAINT "standings_ingestion_run_id_ingestion_runs_id_fk" FOREIGN KEY ("ingestion_run_id") REFERENCES "public"."ingestion_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_stats_snapshots" ADD CONSTRAINT "team_stats_snapshots_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_stats_snapshots" ADD CONSTRAINT "team_stats_snapshots_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_stats_snapshots" ADD CONSTRAINT "team_stats_snapshots_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_stats_snapshots" ADD CONSTRAINT "team_stats_snapshots_ingestion_run_id_ingestion_runs_id_fk" FOREIGN KEY ("ingestion_run_id") REFERENCES "public"."ingestion_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_provider_id_sports_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."sports_providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prediction_results" ADD CONSTRAINT "prediction_results_prediction_id_predictions_id_fk" FOREIGN KEY ("prediction_id") REFERENCES "public"."predictions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prediction_results" ADD CONSTRAINT "prediction_results_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prediction_results" ADD CONSTRAINT "prediction_results_ingestion_run_id_ingestion_runs_id_fk" FOREIGN KEY ("ingestion_run_id") REFERENCES "public"."ingestion_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_model_version_id_model_versions_id_fk" FOREIGN KEY ("model_version_id") REFERENCES "public"."model_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_home_stats_snapshot_id_team_stats_snapshots_id_fk" FOREIGN KEY ("home_stats_snapshot_id") REFERENCES "public"."team_stats_snapshots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_away_stats_snapshot_id_team_stats_snapshots_id_fk" FOREIGN KEY ("away_stats_snapshot_id") REFERENCES "public"."team_stats_snapshots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_validated_by_profiles_id_fk" FOREIGN KEY ("validated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "fixtures_provider_ext_uidx" ON "fixtures" USING btree ("provider_id","external_id");--> statement-breakpoint
CREATE INDEX "fixtures_kickoff_idx" ON "fixtures" USING btree ("kickoff_at");--> statement-breakpoint
CREATE INDEX "fixtures_league_kickoff_idx" ON "fixtures" USING btree ("league_id","kickoff_at");--> statement-breakpoint
CREATE INDEX "fixtures_status_idx" ON "fixtures" USING btree ("fixture_status","kickoff_at");--> statement-breakpoint
CREATE INDEX "ingestion_runs_job_started_idx" ON "ingestion_runs" USING btree ("job_name","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "leagues_provider_ext_uidx" ON "leagues" USING btree ("provider_id","external_id");--> statement-breakpoint
CREATE INDEX "leagues_tracked_idx" ON "leagues" USING btree ("tracked","priority_order");--> statement-breakpoint
CREATE UNIQUE INDEX "seasons_league_year_uidx" ON "seasons" USING btree ("league_id","year");--> statement-breakpoint
CREATE UNIQUE INDEX "standings_league_season_team_uidx" ON "standings" USING btree ("league_id","season_id","team_id");--> statement-breakpoint
CREATE INDEX "standings_rank_idx" ON "standings" USING btree ("league_id","season_id","rank");--> statement-breakpoint
CREATE UNIQUE INDEX "team_stats_team_season_date_uidx" ON "team_stats_snapshots" USING btree ("team_id","season_id","as_of_date");--> statement-breakpoint
CREATE INDEX "team_stats_season_idx" ON "team_stats_snapshots" USING btree ("league_id","season_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_provider_ext_uidx" ON "teams" USING btree ("provider_id","external_id");--> statement-breakpoint
CREATE INDEX "model_versions_active_idx" ON "model_versions" USING btree ("active");--> statement-breakpoint
CREATE INDEX "prediction_results_verdict_settled_idx" ON "prediction_results" USING btree ("verdict","settled_at");--> statement-breakpoint
CREATE INDEX "prediction_results_fixture_idx" ON "prediction_results" USING btree ("fixture_id");--> statement-breakpoint
CREATE UNIQUE INDEX "predictions_fixture_market_model_uidx" ON "predictions" USING btree ("fixture_id","market","model_version_id");--> statement-breakpoint
CREATE INDEX "predictions_status_pub_idx" ON "predictions" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "predictions_locked_idx" ON "predictions" USING btree ("locked_at");