-- BONUVO Phase 6 : moindre privilège (bonuvo_app), RLS forcée sur daily_metrics et portée machine stats_aggregator

REVOKE ALL ON TABLE public.daily_metrics FROM PUBLIC, anon, authenticated;
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.daily_metrics TO bonuvo_app;
--> statement-breakpoint

DROP TRIGGER IF EXISTS daily_metrics_touch_updated_at ON public.daily_metrics;
--> statement-breakpoint

CREATE TRIGGER daily_metrics_touch_updated_at
BEFORE UPDATE ON public.daily_metrics
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
--> statement-breakpoint

ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.daily_metrics FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Lecture et écriture bornées : analyst / editor / admin lisent via stats.read ; seuls stats_aggregator ou conversions.manage écrivent
CREATE POLICY daily_metrics_select_policy ON public.daily_metrics
FOR SELECT TO bonuvo_app
USING (
  (SELECT private.current_db_scope()) = 'stats_aggregator'
  OR (SELECT private.has_permission('stats.read'))
);
--> statement-breakpoint

CREATE POLICY daily_metrics_write_policy ON public.daily_metrics
FOR ALL TO bonuvo_app
USING (
  (SELECT private.current_db_scope()) = 'stats_aggregator'
  OR (SELECT private.has_permission('conversions.manage'))
)
WITH CHECK (
  (SELECT private.current_db_scope()) = 'stats_aggregator'
  OR (SELECT private.has_permission('conversions.manage'))
);
--> statement-breakpoint

-- Portée machine stats_aggregator : lecture seule des faits nécessaires au calcul de daily_metrics
CREATE POLICY visit_events_aggregator_select_policy ON public.visit_events
FOR SELECT TO bonuvo_app
USING ((SELECT private.current_db_scope()) = 'stats_aggregator');
--> statement-breakpoint

CREATE POLICY clicks_aggregator_select_policy ON public.clicks
FOR SELECT TO bonuvo_app
USING ((SELECT private.current_db_scope()) = 'stats_aggregator');
--> statement-breakpoint

CREATE POLICY conversions_aggregator_select_policy ON public.conversions
FOR SELECT TO bonuvo_app
USING ((SELECT private.current_db_scope()) = 'stats_aggregator');
--> statement-breakpoint

CREATE POLICY commissions_aggregator_select_policy ON public.commissions
FOR SELECT TO bonuvo_app
USING ((SELECT private.current_db_scope()) = 'stats_aggregator');
--> statement-breakpoint

CREATE POLICY countries_aggregator_select_policy ON public.countries
FOR SELECT TO bonuvo_app
USING ((SELECT private.current_db_scope()) = 'stats_aggregator');
--> statement-breakpoint

CREATE POLICY bookmakers_aggregator_select_policy ON public.bookmakers
FOR SELECT TO bonuvo_app
USING ((SELECT private.current_db_scope()) = 'stats_aggregator');
--> statement-breakpoint

CREATE POLICY offers_aggregator_select_policy ON public.offers
FOR SELECT TO bonuvo_app
USING ((SELECT private.current_db_scope()) = 'stats_aggregator');
--> statement-breakpoint

CREATE POLICY campaigns_aggregator_select_policy ON public.campaigns
FOR SELECT TO bonuvo_app
USING ((SELECT private.current_db_scope()) = 'stats_aggregator');
