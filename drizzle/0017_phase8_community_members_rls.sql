-- BONUVO Phase 8 : moindre privilège (bonuvo_app), RLS forcée sur BONUVO COMMUNITY et espace MEMBERS,
-- désinscription 1-clic signée (public_unsubscribe), purge RGPD 14j (purge_worker) et registre de consentements append-only.

REVOKE ALL ON TABLE
  public.posts,
  public.community_channels,
  public.coupons,
  public.notifications,
  public.notification_deliveries,
  public.communication_preferences,
  public.member_activity,
  public.account_deletion_requests
FROM PUBLIC, anon, authenticated;
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.posts,
  public.community_channels,
  public.coupons,
  public.notifications,
  public.notification_deliveries,
  public.communication_preferences,
  public.member_activity,
  public.account_deletion_requests
TO bonuvo_app;
--> statement-breakpoint

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'posts',
    'community_channels',
    'coupons',
    'notifications',
    'notification_deliveries',
    'communication_preferences',
    'member_activity',
    'account_deletion_requests'
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

-- 1. posts : lecture publique des articles publiés, édition réservée à content.write / community.manage
CREATE POLICY posts_select_policy ON public.posts
FOR SELECT TO bonuvo_app
USING (
  ((SELECT private.current_db_scope()) = 'public_catalog' AND status = 'published')
  OR (SELECT private.has_permission('content.write'))
  OR (SELECT private.has_permission('community.manage'))
);
--> statement-breakpoint

CREATE POLICY posts_write_policy ON public.posts
FOR ALL TO bonuvo_app
USING (
  (SELECT private.has_permission('content.write'))
  OR (SELECT private.has_permission('community.manage'))
)
WITH CHECK (
  (SELECT private.has_permission('content.write'))
  OR (SELECT private.has_permission('community.manage'))
);
--> statement-breakpoint

-- 2. community_channels : lecture publique des canaux actifs, gestion réservée à community.manage
CREATE POLICY community_channels_select_policy ON public.community_channels
FOR SELECT TO bonuvo_app
USING (
  ((SELECT private.current_db_scope()) = 'public_catalog' AND active = true)
  OR (SELECT private.has_permission('community.manage'))
  OR (SELECT private.has_permission('content.write'))
);
--> statement-breakpoint

CREATE POLICY community_channels_write_policy ON public.community_channels
FOR ALL TO bonuvo_app
USING (
  (SELECT private.has_permission('community.manage'))
)
WITH CHECK (
  (SELECT private.has_permission('community.manage'))
);
--> statement-breakpoint

-- 3. coupons : lecture publique uniquement des coupons validés humainement
CREATE POLICY coupons_select_policy ON public.coupons
FOR SELECT TO bonuvo_app
USING (
  ((SELECT private.current_db_scope()) = 'public_catalog' AND status = 'validated')
  OR (SELECT private.has_permission('community.manage'))
  OR (SELECT private.has_permission('predictions.manage'))
);
--> statement-breakpoint

CREATE POLICY coupons_write_policy ON public.coupons
FOR ALL TO bonuvo_app
USING (
  (SELECT private.has_permission('community.manage'))
  OR (SELECT private.has_permission('predictions.manage'))
)
WITH CHECK (
  (SELECT private.has_permission('community.manage'))
  OR (SELECT private.has_permission('predictions.manage'))
);
--> statement-breakpoint

-- 4. notifications & notification_deliveries
CREATE POLICY notifications_select_policy ON public.notifications
FOR SELECT TO bonuvo_app
USING (
  (SELECT private.has_permission('community.manage'))
);
--> statement-breakpoint

CREATE POLICY notifications_write_policy ON public.notifications
FOR ALL TO bonuvo_app
USING (
  (SELECT private.has_permission('community.manage'))
)
WITH CHECK (
  (SELECT private.has_permission('community.manage'))
);
--> statement-breakpoint

CREATE POLICY notification_deliveries_select_policy ON public.notification_deliveries
FOR SELECT TO bonuvo_app
USING (
  user_id = (SELECT private.current_actor_id())
  OR (SELECT private.has_permission('community.manage'))
  OR (SELECT private.current_db_scope()) = 'purge_worker'
);
--> statement-breakpoint

CREATE POLICY notification_deliveries_write_policy ON public.notification_deliveries
FOR ALL TO bonuvo_app
USING (
  (SELECT private.has_permission('community.manage'))
  OR (SELECT private.current_db_scope()) = 'purge_worker'
)
WITH CHECK (
  (SELECT private.has_permission('community.manage'))
  OR (SELECT private.current_db_scope()) = 'purge_worker'
);
--> statement-breakpoint

-- 5. communication_preferences : isolation stricte propriétaire + désinscription signée + purge RGPD + dispatch admin
CREATE POLICY communication_preferences_select_policy ON public.communication_preferences
FOR SELECT TO bonuvo_app
USING (
  user_id = (SELECT private.current_actor_id())
  OR (SELECT private.current_db_scope()) IN ('public_unsubscribe', 'purge_worker', 'auth_bootstrap')
  OR (SELECT private.has_permission('community.manage'))
  OR (SELECT private.has_permission('users.manage'))
);
--> statement-breakpoint

CREATE POLICY communication_preferences_insert_policy ON public.communication_preferences
FOR INSERT TO bonuvo_app
WITH CHECK (
  user_id = (SELECT private.current_actor_id())
  OR (SELECT private.current_db_scope()) IN ('public_unsubscribe', 'purge_worker', 'auth_bootstrap')
  OR (SELECT private.has_permission('users.manage'))
);
--> statement-breakpoint

CREATE POLICY communication_preferences_update_policy ON public.communication_preferences
FOR UPDATE TO bonuvo_app
USING (
  user_id = (SELECT private.current_actor_id())
  OR (SELECT private.current_db_scope()) IN ('public_unsubscribe', 'purge_worker', 'auth_bootstrap')
  OR (SELECT private.has_permission('users.manage'))
)
WITH CHECK (
  user_id = (SELECT private.current_actor_id())
  OR (SELECT private.current_db_scope()) IN ('public_unsubscribe', 'purge_worker', 'auth_bootstrap')
  OR (SELECT private.has_permission('users.manage'))
);
--> statement-breakpoint

CREATE POLICY communication_preferences_delete_policy ON public.communication_preferences
FOR DELETE TO bonuvo_app
USING (
  (SELECT private.current_db_scope()) = 'purge_worker'
);
--> statement-breakpoint

-- 6. member_activity : lecture et écriture strictement propriétaires (ou public_unsubscribe / purge_worker)
CREATE POLICY member_activity_select_policy ON public.member_activity
FOR SELECT TO bonuvo_app
USING (
  user_id = (SELECT private.current_actor_id())
  OR (SELECT private.current_db_scope()) = 'purge_worker'
  OR (SELECT private.has_permission('users.manage'))
);
--> statement-breakpoint

CREATE POLICY member_activity_insert_policy ON public.member_activity
FOR INSERT TO bonuvo_app
WITH CHECK (
  user_id = (SELECT private.current_actor_id())
  OR (SELECT private.current_db_scope()) IN ('public_unsubscribe', 'purge_worker', 'auth_bootstrap')
);
--> statement-breakpoint

CREATE POLICY member_activity_delete_policy ON public.member_activity
FOR DELETE TO bonuvo_app
USING (
  (SELECT private.current_db_scope()) = 'purge_worker'
);
--> statement-breakpoint

-- 7. account_deletion_requests : propriété stricte + exécution cron purge_worker
CREATE POLICY account_deletion_requests_select_policy ON public.account_deletion_requests
FOR SELECT TO bonuvo_app
USING (
  user_id = (SELECT private.current_actor_id())
  OR (SELECT private.current_db_scope()) = 'purge_worker'
  OR (SELECT private.has_permission('users.manage'))
);
--> statement-breakpoint

CREATE POLICY account_deletion_requests_insert_policy ON public.account_deletion_requests
FOR INSERT TO bonuvo_app
WITH CHECK (
  user_id = (SELECT private.current_actor_id())
  OR (SELECT private.current_db_scope()) = 'purge_worker'
  OR (SELECT private.has_permission('users.manage'))
);
--> statement-breakpoint

CREATE POLICY account_deletion_requests_update_policy ON public.account_deletion_requests
FOR UPDATE TO bonuvo_app
USING (
  user_id = (SELECT private.current_actor_id())
  OR (SELECT private.current_db_scope()) = 'purge_worker'
  OR (SELECT private.has_permission('users.manage'))
)
WITH CHECK (
  user_id = (SELECT private.current_actor_id())
  OR (SELECT private.current_db_scope()) = 'purge_worker'
  OR (SELECT private.has_permission('users.manage'))
);
--> statement-breakpoint

-- 8. Extensions RLS Phase 8 sur profiles et consents pour public_unsubscribe, purge_worker et community.manage
CREATE POLICY profiles_phase8_scope_select_policy ON public.profiles
FOR SELECT TO bonuvo_app
USING (
  (SELECT private.current_db_scope()) IN ('public_unsubscribe', 'purge_worker')
  OR (SELECT private.has_permission('community.manage'))
);
--> statement-breakpoint

CREATE POLICY profiles_phase8_purge_update_policy ON public.profiles
FOR UPDATE TO bonuvo_app
USING (
  (SELECT private.current_db_scope()) = 'purge_worker'
)
WITH CHECK (
  (SELECT private.current_db_scope()) = 'purge_worker'
);
--> statement-breakpoint

CREATE POLICY consents_phase8_scope_select_policy ON public.consents
FOR SELECT TO bonuvo_app
USING (
  (SELECT private.current_db_scope()) IN ('public_unsubscribe', 'purge_worker')
  OR (SELECT private.has_permission('community.manage'))
);
--> statement-breakpoint

CREATE POLICY consents_phase8_unsubscribe_insert_policy ON public.consents
FOR INSERT TO bonuvo_app
WITH CHECK (
  (SELECT private.current_db_scope()) IN ('public_unsubscribe', 'purge_worker')
);
