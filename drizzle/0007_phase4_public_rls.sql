-- BONUVO Phase 4 : tables publiques de tracking, moindre privilège (bonuvo_app) et politiques RLS de lecture publique stricte

REVOKE ALL ON TABLE
  public.campaigns,
  public.clicks,
  public.visit_events
FROM PUBLIC, anon, authenticated;
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.campaigns TO bonuvo_app;
--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE public.clicks, public.visit_events TO bonuvo_app;
--> statement-breakpoint

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['campaigns', 'clicks', 'visit_events']
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

-- Lecture publique strictement bornée aux entités actives, publiées et non expirées
CREATE POLICY countries_public_select_policy ON public.countries
FOR SELECT TO bonuvo_app
USING (
  (SELECT private.current_db_scope()) IN ('public_catalog', 'public_tracking')
  AND active = true
);
--> statement-breakpoint

CREATE POLICY payment_methods_public_select_policy ON public.payment_methods
FOR SELECT TO bonuvo_app
USING (
  (SELECT private.current_db_scope()) IN ('public_catalog', 'public_tracking')
  AND active = true
);
--> statement-breakpoint

CREATE POLICY media_assets_public_select_policy ON public.media_assets
FOR SELECT TO bonuvo_app
USING (
  (SELECT private.current_db_scope()) = 'public_catalog'
  AND status = 'active'
  AND deleted_at IS NULL
);
--> statement-breakpoint

CREATE POLICY bookmakers_public_select_policy ON public.bookmakers
FOR SELECT TO bonuvo_app
USING (
  (SELECT private.current_db_scope()) IN ('public_catalog', 'public_tracking')
  AND status = 'active'
  AND deleted_at IS NULL
);
--> statement-breakpoint

CREATE POLICY bookmaker_countries_public_select_policy ON public.bookmaker_countries
FOR SELECT TO bonuvo_app
USING (
  (SELECT private.current_db_scope()) IN ('public_catalog', 'public_tracking')
  AND status = 'active'
  AND deleted_at IS NULL
  AND eligible = true
);
--> statement-breakpoint

CREATE POLICY bookmaker_payment_methods_public_select_policy ON public.bookmaker_payment_methods
FOR SELECT TO bonuvo_app
USING ((SELECT private.current_db_scope()) = 'public_catalog');
--> statement-breakpoint

CREATE POLICY bookmaker_ratings_public_select_policy ON public.bookmaker_ratings
FOR SELECT TO bonuvo_app
USING ((SELECT private.current_db_scope()) = 'public_catalog');
--> statement-breakpoint

CREATE POLICY offers_public_select_policy ON public.offers
FOR SELECT TO bonuvo_app
USING (
  (SELECT private.current_db_scope()) IN ('public_catalog', 'public_tracking')
  AND status = 'published'
  AND deleted_at IS NULL
  AND (valid_from IS NULL OR valid_from <= now())
  AND (valid_until IS NULL OR valid_until > now())
);
--> statement-breakpoint

CREATE POLICY offer_countries_public_select_policy ON public.offer_countries
FOR SELECT TO bonuvo_app
USING ((SELECT private.current_db_scope()) IN ('public_catalog', 'public_tracking'));
--> statement-breakpoint

CREATE POLICY offer_terms_public_select_policy ON public.offer_terms
FOR SELECT TO bonuvo_app
USING (
  (SELECT private.current_db_scope()) = 'public_catalog'
  AND status = 'active'
  AND deleted_at IS NULL
);
--> statement-breakpoint

CREATE POLICY offer_highlights_public_select_policy ON public.offer_highlights
FOR SELECT TO bonuvo_app
USING (
  (SELECT private.current_db_scope()) = 'public_catalog'
  AND status = 'active'
  AND deleted_at IS NULL
);
--> statement-breakpoint

CREATE POLICY promo_codes_public_select_policy ON public.promo_codes
FOR SELECT TO bonuvo_app
USING (
  (SELECT private.current_db_scope()) IN ('public_catalog', 'public_tracking')
  AND status = 'active'
  AND deleted_at IS NULL
  AND (valid_from IS NULL OR valid_from <= now())
  AND (valid_until IS NULL OR valid_until > now())
);
--> statement-breakpoint

CREATE POLICY affiliate_networks_public_select_policy ON public.affiliate_networks
FOR SELECT TO bonuvo_app
USING (
  (SELECT private.current_db_scope()) IN ('public_catalog', 'public_tracking')
  AND status = 'active'
  AND deleted_at IS NULL
);
--> statement-breakpoint

CREATE POLICY affiliate_links_public_select_policy ON public.affiliate_links
FOR SELECT TO bonuvo_app
USING (
  (SELECT private.current_db_scope()) IN ('public_catalog', 'public_tracking')
  AND active = true
  AND status = 'active'
  AND deleted_at IS NULL
  AND destination_url LIKE 'https://%'
  AND (SELECT private.url_host_allowed(bookmaker_id, destination_url))
);
--> statement-breakpoint

-- Campagnes, clics et événements de visite
CREATE POLICY campaigns_select_policy ON public.campaigns
FOR SELECT TO bonuvo_app
USING (
  (SELECT private.has_permission('offers.read'))
  OR (SELECT private.has_permission('links.manage'))
  OR (
    (SELECT private.current_db_scope()) IN ('public_catalog', 'public_tracking')
    AND status = 'active'
    AND deleted_at IS NULL
  )
);
--> statement-breakpoint

CREATE POLICY campaigns_write_policy ON public.campaigns
FOR ALL TO bonuvo_app
USING ((SELECT private.has_permission('links.manage')))
WITH CHECK ((SELECT private.has_permission('links.manage')));
--> statement-breakpoint

CREATE POLICY clicks_select_policy ON public.clicks
FOR SELECT TO bonuvo_app
USING (
  (SELECT private.has_permission('stats.read'))
  OR (SELECT private.has_permission('offers.read'))
  OR (SELECT private.has_permission('links.manage'))
);
--> statement-breakpoint

CREATE POLICY clicks_insert_policy ON public.clicks
FOR INSERT TO bonuvo_app
WITH CHECK (
  (SELECT private.current_db_scope()) = 'public_tracking'
  AND EXISTS (
    SELECT 1
    FROM public.affiliate_links al
    JOIN public.bookmakers b ON b.id = al.bookmaker_id
    WHERE al.id = affiliate_link_id
      AND al.active = true
      AND al.status = 'active'
      AND al.deleted_at IS NULL
      AND al.destination_url LIKE 'https://%'
      AND b.status = 'active'
      AND b.deleted_at IS NULL
  )
);
--> statement-breakpoint

CREATE POLICY visit_events_select_policy ON public.visit_events
FOR SELECT TO bonuvo_app
USING (
  (SELECT private.has_permission('stats.read'))
  OR (SELECT private.has_permission('offers.read'))
);
--> statement-breakpoint

CREATE POLICY visit_events_insert_policy ON public.visit_events
FOR INSERT TO bonuvo_app
WITH CHECK ((SELECT private.current_db_scope()) = 'public_tracking');
