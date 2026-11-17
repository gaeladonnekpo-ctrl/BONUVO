-- BONUVO Phase 7 : moindre privilège (bonuvo_app), RLS forcée, portée ai_pipeline et immutabilité des pronostics verrouillés

REVOKE ALL ON TABLE
  public.sports_providers,
  public.ingestion_runs,
  public.leagues,
  public.seasons,
  public.teams,
  public.fixtures,
  public.team_stats_snapshots,
  public.standings,
  public.model_versions,
  public.predictions,
  public.prediction_results
FROM PUBLIC, anon, authenticated;
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.sports_providers,
  public.ingestion_runs,
  public.leagues,
  public.seasons,
  public.teams,
  public.fixtures,
  public.team_stats_snapshots,
  public.standings,
  public.model_versions,
  public.predictions,
  public.prediction_results
TO bonuvo_app;
--> statement-breakpoint

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'sports_providers',
    'ingestion_runs',
    'leagues',
    'seasons',
    'teams',
    'fixtures',
    'team_stats_snapshots',
    'standings',
    'model_versions',
    'predictions',
    'prediction_results'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_touch_updated_at ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE TRIGGER %I_touch_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at()',
      tbl,
      tbl
    );
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', tbl);
  END LOOP;
END
$$;
--> statement-breakpoint

-- Trigger strict d'intégrité BONUVO AI :
-- 1) Aucune création de pronostic après le coup d'envoi
-- 2) Aucun pronostic verrouillé (locked_at IS NOT NULL) modifiable ni supprimable
CREATE OR REPLACE FUNCTION private.guard_prediction_immutability()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_kickoff timestamptz;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT kickoff_at INTO v_kickoff FROM public.fixtures WHERE id = NEW.fixture_id;
    IF v_kickoff IS NULL OR v_kickoff <= now() THEN
      RAISE EXCEPTION 'CANNOT_PREDICT_AFTER_KICKOFF';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.locked_at IS NOT NULL THEN
      RAISE EXCEPTION 'PREDICTION_LOCKED_IMMUTABLE';
    END IF;
    RETURN OLD;
  END IF;

  -- TG_OP = 'UPDATE'
  IF OLD.locked_at IS NOT NULL THEN
    SELECT kickoff_at INTO v_kickoff FROM public.fixtures WHERE id = OLD.fixture_id;
    IF v_kickoff IS NULL OR v_kickoff <= now() THEN
      RAISE EXCEPTION 'PREDICTION_LOCKED_IMMUTABLE';
    END IF;

    IF NEW.fixture_id IS DISTINCT FROM OLD.fixture_id
      OR NEW.model_version_id IS DISTINCT FROM OLD.model_version_id
      OR NEW.market IS DISTINCT FROM OLD.market
      OR NEW.probabilities_json IS DISTINCT FROM OLD.probabilities_json
      OR NEW.picked_selection IS DISTINCT FROM OLD.picked_selection
      OR NEW.confidence_level IS DISTINCT FROM OLD.confidence_level
      OR NEW.confidence_score IS DISTINCT FROM OLD.confidence_score
      OR NEW.expected_home_goals IS DISTINCT FROM OLD.expected_home_goals
      OR NEW.expected_away_goals IS DISTINCT FROM OLD.expected_away_goals
      OR NEW.input_snapshot_hash IS DISTINCT FROM OLD.input_snapshot_hash
      OR NEW.home_stats_snapshot_id IS DISTINCT FROM OLD.home_stats_snapshot_id
      OR NEW.away_stats_snapshot_id IS DISTINCT FROM OLD.away_stats_snapshot_id
      OR NEW.analysis_text IS DISTINCT FROM OLD.analysis_text
      OR NEW.analysis_status IS DISTINCT FROM OLD.analysis_status
      OR NEW.status IS DISTINCT FROM OLD.status
      OR NEW.published_at IS DISTINCT FROM OLD.published_at
      OR NEW.locked_at IS DISTINCT FROM OLD.locked_at
    THEN
      RAISE EXCEPTION 'PREDICTION_LOCKED_IMMUTABLE';
    END IF;

    -- Seule la validation humaine de coupon est autorisée avant le coup d'envoi
    IF NOT (OLD.coupon_validated = false AND NEW.coupon_validated = true) THEN
      RAISE EXCEPTION 'PREDICTION_LOCKED_IMMUTABLE';
    END IF;
  END IF;

  RETURN NEW;
END
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS predictions_immutability_guard ON public.predictions;
--> statement-breakpoint

CREATE TRIGGER predictions_immutability_guard
BEFORE INSERT OR UPDATE OR DELETE ON public.predictions
FOR EACH ROW EXECUTE FUNCTION private.guard_prediction_immutability();
--> statement-breakpoint

-- Politiques RLS : public_catalog (lecture publiée), ai_pipeline (tâches), predictions.manage / stats.read (admin)
CREATE POLICY sports_providers_select_policy ON public.sports_providers
FOR SELECT TO bonuvo_app
USING (
  (SELECT private.current_db_scope()) = 'ai_pipeline'
  OR (SELECT private.has_permission('predictions.manage'))
  OR (SELECT private.has_permission('stats.read'))
);
--> statement-breakpoint

CREATE POLICY sports_providers_write_policy ON public.sports_providers
FOR ALL TO bonuvo_app
USING (
  (SELECT private.current_db_scope()) = 'ai_pipeline'
  OR (SELECT private.has_permission('predictions.manage'))
)
WITH CHECK (
  (SELECT private.current_db_scope()) = 'ai_pipeline'
  OR (SELECT private.has_permission('predictions.manage'))
);
--> statement-breakpoint

CREATE POLICY ingestion_runs_select_policy ON public.ingestion_runs
FOR SELECT TO bonuvo_app
USING (
  (SELECT private.current_db_scope()) = 'ai_pipeline'
  OR (SELECT private.has_permission('predictions.manage'))
  OR (SELECT private.has_permission('stats.read'))
);
--> statement-breakpoint

CREATE POLICY ingestion_runs_write_policy ON public.ingestion_runs
FOR ALL TO bonuvo_app
USING (
  (SELECT private.current_db_scope()) = 'ai_pipeline'
  OR (SELECT private.has_permission('predictions.manage'))
)
WITH CHECK (
  (SELECT private.current_db_scope()) = 'ai_pipeline'
  OR (SELECT private.has_permission('predictions.manage'))
);
--> statement-breakpoint

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['leagues', 'seasons', 'teams', 'fixtures', 'team_stats_snapshots', 'standings', 'model_versions', 'prediction_results']
  LOOP
    EXECUTE format(
      'CREATE POLICY %I_select_policy ON public.%I FOR SELECT TO bonuvo_app USING ((SELECT private.current_db_scope()) IN (''public_catalog'', ''ai_pipeline'') OR (SELECT private.has_permission(''predictions.manage'')) OR (SELECT private.has_permission(''stats.read'')))',
      t, t
    );
    EXECUTE format(
      'CREATE POLICY %I_write_policy ON public.%I FOR ALL TO bonuvo_app USING ((SELECT private.current_db_scope()) = ''ai_pipeline'' OR (SELECT private.has_permission(''predictions.manage''))) WITH CHECK ((SELECT private.current_db_scope()) = ''ai_pipeline'' OR (SELECT private.has_permission(''predictions.manage'')))',
      t, t
    );
  END LOOP;
END
$$;
--> statement-breakpoint

CREATE POLICY predictions_select_policy ON public.predictions
FOR SELECT TO bonuvo_app
USING (
  ((SELECT private.current_db_scope()) = 'public_catalog' AND status IN ('published', 'void'))
  OR (SELECT private.current_db_scope()) = 'ai_pipeline'
  OR (SELECT private.has_permission('predictions.manage'))
  OR (SELECT private.has_permission('stats.read'))
);
--> statement-breakpoint

CREATE POLICY predictions_write_policy ON public.predictions
FOR ALL TO bonuvo_app
USING (
  (SELECT private.current_db_scope()) = 'ai_pipeline'
  OR (SELECT private.has_permission('predictions.manage'))
)
WITH CHECK (
  (SELECT private.current_db_scope()) = 'ai_pipeline'
  OR (SELECT private.has_permission('predictions.manage'))
);
