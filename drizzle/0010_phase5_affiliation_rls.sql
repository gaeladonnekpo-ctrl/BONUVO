-- BONUVO Phase 5 : moindre privilège (bonuvo_app), RLS forcée et garde-fous postbacks/conversions/commissions

REVOKE ALL ON TABLE
  public.postback_events,
  public.conversion_imports,
  public.conversions,
  public.commissions,
  public.commission_history
FROM PUBLIC, anon, authenticated;
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE ON TABLE
  public.postback_events,
  public.conversion_imports,
  public.conversions,
  public.commissions
TO bonuvo_app;
--> statement-breakpoint

-- Historique de commissions strictement en ajout seul (immuable)
GRANT SELECT, INSERT ON TABLE public.commission_history TO bonuvo_app;
--> statement-breakpoint

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'postback_events',
    'conversion_imports',
    'conversions',
    'commissions'
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

ALTER TABLE public.commission_history ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.commission_history FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Portée machine postback_ingest : lecture strictement limitée aux référentiels nécessaires à l'attribution
CREATE POLICY affiliate_networks_postback_select_policy ON public.affiliate_networks
FOR SELECT TO bonuvo_app
USING (
  (SELECT private.current_db_scope()) = 'postback_ingest'
  AND status = 'active'
  AND deleted_at IS NULL
);
--> statement-breakpoint

CREATE POLICY bookmakers_postback_select_policy ON public.bookmakers
FOR SELECT TO bonuvo_app
USING (
  (SELECT private.current_db_scope()) = 'postback_ingest'
  AND deleted_at IS NULL
);
--> statement-breakpoint

CREATE POLICY countries_postback_select_policy ON public.countries
FOR SELECT TO bonuvo_app
USING ((SELECT private.current_db_scope()) = 'postback_ingest');
--> statement-breakpoint

CREATE POLICY promo_codes_postback_select_policy ON public.promo_codes
FOR SELECT TO bonuvo_app
USING (
  (SELECT private.current_db_scope()) = 'postback_ingest'
  AND status = 'active'
  AND deleted_at IS NULL
);
--> statement-breakpoint

CREATE POLICY clicks_postback_select_policy ON public.clicks
FOR SELECT TO bonuvo_app
USING ((SELECT private.current_db_scope()) = 'postback_ingest');
--> statement-breakpoint

-- Événements bruts de postbacks / webhooks
CREATE POLICY postback_events_select_policy ON public.postback_events
FOR SELECT TO bonuvo_app
USING (
  (SELECT private.current_db_scope()) = 'postback_ingest'
  OR (SELECT private.has_permission('conversions.manage'))
  OR (SELECT private.has_permission('links.manage'))
  OR (SELECT private.has_permission('stats.read'))
);
--> statement-breakpoint

CREATE POLICY postback_events_insert_policy ON public.postback_events
FOR INSERT TO bonuvo_app
WITH CHECK (
  (SELECT private.current_db_scope()) = 'postback_ingest'
  OR (SELECT private.has_permission('conversions.manage'))
);
--> statement-breakpoint

CREATE POLICY postback_events_update_policy ON public.postback_events
FOR UPDATE TO bonuvo_app
USING (
  (SELECT private.current_db_scope()) = 'postback_ingest'
  OR (SELECT private.has_permission('conversions.manage'))
)
WITH CHECK (
  (SELECT private.current_db_scope()) = 'postback_ingest'
  OR (SELECT private.has_permission('conversions.manage'))
);
--> statement-breakpoint

-- Imports CSV (réservés aux gestionnaires de conversions)
CREATE POLICY conversion_imports_select_policy ON public.conversion_imports
FOR SELECT TO bonuvo_app
USING (
  (SELECT private.has_permission('conversions.manage'))
  OR (SELECT private.has_permission('stats.read'))
);
--> statement-breakpoint

CREATE POLICY conversion_imports_write_policy ON public.conversion_imports
FOR ALL TO bonuvo_app
USING ((SELECT private.has_permission('conversions.manage')))
WITH CHECK ((SELECT private.has_permission('conversions.manage')));
--> statement-breakpoint

-- Conversions (source obligatoire + écriture machine postback_ingest ou conversions.manage)
CREATE POLICY conversions_select_policy ON public.conversions
FOR SELECT TO bonuvo_app
USING (
  (SELECT private.current_db_scope()) = 'postback_ingest'
  OR (SELECT private.has_permission('conversions.manage'))
  OR (SELECT private.has_permission('stats.read'))
  OR (SELECT private.has_permission('offers.read'))
);
--> statement-breakpoint

CREATE POLICY conversions_insert_policy ON public.conversions
FOR INSERT TO bonuvo_app
WITH CHECK (
  (postback_event_id IS NOT NULL OR import_id IS NOT NULL)
  AND (
    (SELECT private.current_db_scope()) = 'postback_ingest'
    OR (SELECT private.has_permission('conversions.manage'))
  )
);
--> statement-breakpoint

CREATE POLICY conversions_update_policy ON public.conversions
FOR UPDATE TO bonuvo_app
USING ((SELECT private.has_permission('conversions.manage')))
WITH CHECK ((SELECT private.has_permission('conversions.manage')));
--> statement-breakpoint

-- Commissions (création initiale pending en postback_ingest, transitions réservées à conversions.manage)
CREATE POLICY commissions_select_policy ON public.commissions
FOR SELECT TO bonuvo_app
USING (
  (SELECT private.has_permission('conversions.manage'))
  OR (SELECT private.has_permission('stats.read'))
);
--> statement-breakpoint

CREATE POLICY commissions_insert_policy ON public.commissions
FOR INSERT TO bonuvo_app
WITH CHECK (
  (conversion_id IS NOT NULL OR import_id IS NOT NULL)
  AND (
    (
      (SELECT private.current_db_scope()) = 'postback_ingest'
      AND status = 'pending'
    )
    OR (SELECT private.has_permission('conversions.manage'))
  )
);
--> statement-breakpoint

CREATE POLICY commissions_update_policy ON public.commissions
FOR UPDATE TO bonuvo_app
USING ((SELECT private.has_permission('conversions.manage')))
WITH CHECK (
  (SELECT private.has_permission('conversions.manage'))
  AND (status <> 'confirmed' OR length(trim(proof_reference)) > 0)
);
--> statement-breakpoint

-- Historique immuable de commissions
CREATE POLICY commission_history_select_policy ON public.commission_history
FOR SELECT TO bonuvo_app
USING (
  (SELECT private.has_permission('conversions.manage'))
  OR (SELECT private.has_permission('stats.read'))
);
--> statement-breakpoint

CREATE POLICY commission_history_insert_policy ON public.commission_history
FOR INSERT TO bonuvo_app
WITH CHECK ((SELECT private.has_permission('conversions.manage')));
