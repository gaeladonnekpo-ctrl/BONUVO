-- BONUVO Phase 3 : moindre privilège (bonuvo_app), RLS forcée et garde-fous métier catalogue/affiliation

REVOKE ALL ON TABLE
  public.countries,
  public.payment_methods,
  public.media_assets,
  public.settings,
  public.bookmakers,
  public.bookmaker_countries,
  public.bookmaker_payment_methods,
  public.bookmaker_ratings,
  public.offers,
  public.offer_countries,
  public.offer_terms,
  public.offer_highlights,
  public.promo_codes,
  public.affiliate_networks,
  public.affiliate_links
FROM PUBLIC, anon, authenticated;
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE ON TABLE
  public.countries,
  public.payment_methods,
  public.media_assets,
  public.settings
TO bonuvo_app;
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.bookmakers,
  public.bookmaker_countries,
  public.bookmaker_payment_methods,
  public.bookmaker_ratings,
  public.offers,
  public.offer_countries,
  public.offer_terms,
  public.offer_highlights,
  public.promo_codes,
  public.affiliate_networks,
  public.affiliate_links
TO bonuvo_app;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION private.url_host_allowed(target_bookmaker_id uuid, target_url text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH extracted AS (
    SELECT lower(
      split_part(
        split_part(
          split_part(
            split_part(regexp_replace(target_url, '^https://', ''), '/', 1),
            '?',
            1
          ),
          '#',
          1
        ),
        ':',
        1
      )
    ) AS host
  )
  SELECT EXISTS (
    SELECT 1
    FROM public.bookmakers b, extracted e, unnest(b.allowed_hosts) AS allowed
    WHERE b.id = target_bookmaker_id
      AND b.deleted_at IS NULL
      AND e.host <> ''
      AND (
        e.host = lower(trim(allowed))
        OR e.host LIKE '%.' || lower(trim(allowed))
      )
  );
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION private.url_host_allowed(uuid, text) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION private.url_host_allowed(uuid, text) TO postgres, bonuvo_app;
--> statement-breakpoint

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'countries',
    'payment_methods',
    'media_assets',
    'settings',
    'bookmakers',
    'bookmaker_countries',
    'bookmaker_payment_methods',
    'bookmaker_ratings',
    'offers',
    'offer_countries',
    'offer_terms',
    'offer_highlights',
    'promo_codes',
    'affiliate_networks',
    'affiliate_links'
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

-- Référentiels pays & paiements
CREATE POLICY countries_select_policy ON public.countries
FOR SELECT TO bonuvo_app
USING ((SELECT private.has_permission('offers.read')) OR (SELECT private.has_permission('settings.read')));
--> statement-breakpoint
CREATE POLICY countries_insert_policy ON public.countries
FOR INSERT TO bonuvo_app
WITH CHECK ((SELECT private.has_permission('offers.write')) OR (SELECT private.has_permission('settings.manage')));
--> statement-breakpoint
CREATE POLICY countries_update_policy ON public.countries
FOR UPDATE TO bonuvo_app
USING ((SELECT private.has_permission('offers.write')) OR (SELECT private.has_permission('settings.manage')))
WITH CHECK ((SELECT private.has_permission('offers.write')) OR (SELECT private.has_permission('settings.manage')));
--> statement-breakpoint

CREATE POLICY payment_methods_select_policy ON public.payment_methods
FOR SELECT TO bonuvo_app
USING ((SELECT private.has_permission('offers.read')));
--> statement-breakpoint
CREATE POLICY payment_methods_insert_policy ON public.payment_methods
FOR INSERT TO bonuvo_app
WITH CHECK ((SELECT private.has_permission('offers.write')));
--> statement-breakpoint
CREATE POLICY payment_methods_update_policy ON public.payment_methods
FOR UPDATE TO bonuvo_app
USING ((SELECT private.has_permission('offers.write')))
WITH CHECK ((SELECT private.has_permission('offers.write')));
--> statement-breakpoint

-- Médias & paramètres
CREATE POLICY media_assets_select_policy ON public.media_assets
FOR SELECT TO bonuvo_app
USING ((SELECT private.has_permission('offers.read')));
--> statement-breakpoint
CREATE POLICY media_assets_insert_policy ON public.media_assets
FOR INSERT TO bonuvo_app
WITH CHECK ((SELECT private.has_permission('offers.write')));
--> statement-breakpoint
CREATE POLICY media_assets_update_policy ON public.media_assets
FOR UPDATE TO bonuvo_app
USING ((SELECT private.has_permission('offers.write')))
WITH CHECK ((SELECT private.has_permission('offers.write')));
--> statement-breakpoint

CREATE POLICY settings_select_policy ON public.settings
FOR SELECT TO bonuvo_app
USING ((SELECT private.has_permission('settings.read')));
--> statement-breakpoint
CREATE POLICY settings_insert_policy ON public.settings
FOR INSERT TO bonuvo_app
WITH CHECK ((SELECT private.has_permission('settings.manage')));
--> statement-breakpoint
CREATE POLICY settings_update_policy ON public.settings
FOR UPDATE TO bonuvo_app
USING ((SELECT private.has_permission('settings.manage')))
WITH CHECK ((SELECT private.has_permission('settings.manage')));
--> statement-breakpoint

-- Bookmakers et sous-tables
CREATE POLICY bookmakers_select_policy ON public.bookmakers
FOR SELECT TO bonuvo_app
USING ((SELECT private.has_permission('offers.read')));
--> statement-breakpoint
CREATE POLICY bookmakers_insert_policy ON public.bookmakers
FOR INSERT TO bonuvo_app
WITH CHECK ((SELECT private.has_permission('offers.write')));
--> statement-breakpoint
CREATE POLICY bookmakers_update_policy ON public.bookmakers
FOR UPDATE TO bonuvo_app
USING ((SELECT private.has_permission('offers.write')))
WITH CHECK ((SELECT private.has_permission('offers.write')));
--> statement-breakpoint
CREATE POLICY bookmakers_delete_policy ON public.bookmakers
FOR DELETE TO bonuvo_app
USING (
  (SELECT private.has_permission('offers.publish'))
  AND ((SELECT private.has_role('admin')) OR (SELECT private.has_role('super_admin')))
);
--> statement-breakpoint

CREATE POLICY bookmaker_countries_select_policy ON public.bookmaker_countries
FOR SELECT TO bonuvo_app
USING ((SELECT private.has_permission('offers.read')));
--> statement-breakpoint
CREATE POLICY bookmaker_countries_write_policy ON public.bookmaker_countries
FOR ALL TO bonuvo_app
USING ((SELECT private.has_permission('offers.write')))
WITH CHECK ((SELECT private.has_permission('offers.write')));
--> statement-breakpoint

CREATE POLICY bookmaker_payment_methods_select_policy ON public.bookmaker_payment_methods
FOR SELECT TO bonuvo_app
USING ((SELECT private.has_permission('offers.read')));
--> statement-breakpoint
CREATE POLICY bookmaker_payment_methods_write_policy ON public.bookmaker_payment_methods
FOR ALL TO bonuvo_app
USING ((SELECT private.has_permission('offers.write')))
WITH CHECK ((SELECT private.has_permission('offers.write')));
--> statement-breakpoint

CREATE POLICY bookmaker_ratings_select_policy ON public.bookmaker_ratings
FOR SELECT TO bonuvo_app
USING ((SELECT private.has_permission('offers.read')));
--> statement-breakpoint
CREATE POLICY bookmaker_ratings_write_policy ON public.bookmaker_ratings
FOR ALL TO bonuvo_app
USING ((SELECT private.has_permission('offers.write')))
WITH CHECK ((SELECT private.has_permission('offers.write')));
--> statement-breakpoint

-- Offres : un editor (sans offers.publish) ne peut ni publier ni supprimer définitivement
CREATE POLICY offers_select_policy ON public.offers
FOR SELECT TO bonuvo_app
USING ((SELECT private.has_permission('offers.read')));
--> statement-breakpoint
CREATE POLICY offers_insert_policy ON public.offers
FOR INSERT TO bonuvo_app
WITH CHECK (
  (SELECT private.has_permission('offers.write'))
  AND (status <> 'published' OR (SELECT private.has_permission('offers.publish')))
);
--> statement-breakpoint
CREATE POLICY offers_update_policy ON public.offers
FOR UPDATE TO bonuvo_app
USING ((SELECT private.has_permission('offers.write')))
WITH CHECK (
  (SELECT private.has_permission('offers.write'))
  AND (status <> 'published' OR (SELECT private.has_permission('offers.publish')))
);
--> statement-breakpoint
CREATE POLICY offers_delete_policy ON public.offers
FOR DELETE TO bonuvo_app
USING (
  (SELECT private.has_permission('offers.publish'))
  AND ((SELECT private.has_role('admin')) OR (SELECT private.has_role('super_admin')))
);
--> statement-breakpoint

CREATE POLICY offer_countries_select_policy ON public.offer_countries
FOR SELECT TO bonuvo_app
USING ((SELECT private.has_permission('offers.read')));
--> statement-breakpoint
CREATE POLICY offer_countries_write_policy ON public.offer_countries
FOR ALL TO bonuvo_app
USING ((SELECT private.has_permission('offers.write')))
WITH CHECK ((SELECT private.has_permission('offers.write')));
--> statement-breakpoint

CREATE POLICY offer_terms_select_policy ON public.offer_terms
FOR SELECT TO bonuvo_app
USING ((SELECT private.has_permission('offers.read')));
--> statement-breakpoint
CREATE POLICY offer_terms_write_policy ON public.offer_terms
FOR ALL TO bonuvo_app
USING ((SELECT private.has_permission('offers.write')))
WITH CHECK ((SELECT private.has_permission('offers.write')));
--> statement-breakpoint

CREATE POLICY offer_highlights_select_policy ON public.offer_highlights
FOR SELECT TO bonuvo_app
USING ((SELECT private.has_permission('offers.read')));
--> statement-breakpoint
CREATE POLICY offer_highlights_write_policy ON public.offer_highlights
FOR ALL TO bonuvo_app
USING ((SELECT private.has_permission('offers.write')))
WITH CHECK ((SELECT private.has_permission('offers.write')));
--> statement-breakpoint

CREATE POLICY promo_codes_select_policy ON public.promo_codes
FOR SELECT TO bonuvo_app
USING ((SELECT private.has_permission('offers.read')));
--> statement-breakpoint
CREATE POLICY promo_codes_write_policy ON public.promo_codes
FOR ALL TO bonuvo_app
USING ((SELECT private.has_permission('offers.write')))
WITH CHECK ((SELECT private.has_permission('offers.write')));
--> statement-breakpoint

-- Réseaux et liens d'affiliation (contrôle B1 : links.manage + HTTPS + allowed_hosts)
CREATE POLICY affiliate_networks_select_policy ON public.affiliate_networks
FOR SELECT TO bonuvo_app
USING ((SELECT private.has_permission('offers.read')) OR (SELECT private.has_permission('links.manage')));
--> statement-breakpoint
CREATE POLICY affiliate_networks_write_policy ON public.affiliate_networks
FOR ALL TO bonuvo_app
USING ((SELECT private.has_permission('links.manage')))
WITH CHECK ((SELECT private.has_permission('links.manage')));
--> statement-breakpoint

CREATE POLICY affiliate_links_select_policy ON public.affiliate_links
FOR SELECT TO bonuvo_app
USING ((SELECT private.has_permission('offers.read')) OR (SELECT private.has_permission('links.manage')));
--> statement-breakpoint
CREATE POLICY affiliate_links_insert_policy ON public.affiliate_links
FOR INSERT TO bonuvo_app
WITH CHECK (
  (SELECT private.has_permission('links.manage'))
  AND destination_url LIKE 'https://%'
  AND (SELECT private.url_host_allowed(bookmaker_id, destination_url))
);
--> statement-breakpoint
CREATE POLICY affiliate_links_update_policy ON public.affiliate_links
FOR UPDATE TO bonuvo_app
USING ((SELECT private.has_permission('links.manage')))
WITH CHECK (
  (SELECT private.has_permission('links.manage'))
  AND destination_url LIKE 'https://%'
  AND (SELECT private.url_host_allowed(bookmaker_id, destination_url))
);
--> statement-breakpoint
CREATE POLICY affiliate_links_delete_policy ON public.affiliate_links
FOR DELETE TO bonuvo_app
USING ((SELECT private.has_permission('links.manage')));
