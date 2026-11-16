-- BONUVO Phase 2 : moindre privilège (bonuvo_app), schéma privé, RLS forcée et immuabilité des journaux
CREATE SCHEMA IF NOT EXISTS private;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bonuvo_app') THEN
    CREATE ROLE bonuvo_app NOLOGIN NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
  END IF;
END
$$;
--> statement-breakpoint
GRANT bonuvo_app TO postgres;
--> statement-breakpoint
REVOKE ALL ON SCHEMA public FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON SCHEMA public FROM anon, authenticated;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO postgres, bonuvo_app;
--> statement-breakpoint
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT USAGE ON SCHEMA private TO postgres, bonuvo_app;
--> statement-breakpoint
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO bonuvo_app;
--> statement-breakpoint
GRANT SELECT ON TABLE public.roles, public.permissions, public.role_permissions TO bonuvo_app;
--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON TABLE public.user_roles TO bonuvo_app;
--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE public.consents, public.audit_log, public.security_events TO bonuvo_app;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION private.current_actor_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.current_user_id', true), '')::uuid,
    (SELECT auth.uid())
  );
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION private.current_db_scope()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT COALESCE(current_setting('app.db_scope', true), '');
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION private.has_role(target_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = private.current_actor_id()
      AND r.name = target_role
  );
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION private.has_permission(target_permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role_id = ur.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = private.current_actor_id()
      AND p.key = target_permission
  );
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION private.role_is_super_admin(target_role_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.roles r
    WHERE r.id = target_role_id
      AND r.name = 'super_admin'
  );
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION private.role_is_member(target_role_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.roles r
    WHERE r.id = target_role_id
      AND r.name = 'member'
  );
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION private.user_is_super_admin(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = target_user_id
      AND r.name = 'super_admin'
  );
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION private.current_actor_id() FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON FUNCTION private.current_db_scope() FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON FUNCTION private.has_role(text) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON FUNCTION private.has_permission(text) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON FUNCTION private.role_is_super_admin(uuid) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON FUNCTION private.role_is_member(uuid) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON FUNCTION private.user_is_super_admin(uuid) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION private.current_actor_id() TO bonuvo_app;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION private.current_db_scope() TO bonuvo_app;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION private.has_role(text) TO bonuvo_app;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION private.has_permission(text) TO bonuvo_app;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION private.role_is_super_admin(uuid) TO bonuvo_app;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION private.role_is_member(uuid) TO bonuvo_app;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION private.user_is_super_admin(uuid) TO bonuvo_app;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION private.prevent_immutable_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Table % is immutable: % is forbidden', TG_TABLE_NAME, TG_OP
    USING ERRCODE = '42501';
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION private.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS consents_immutable_guard ON public.consents;
--> statement-breakpoint
CREATE TRIGGER consents_immutable_guard
BEFORE UPDATE OR DELETE ON public.consents
FOR EACH ROW EXECUTE FUNCTION private.prevent_immutable_mutation();
--> statement-breakpoint
DROP TRIGGER IF EXISTS audit_log_immutable_guard ON public.audit_log;
--> statement-breakpoint
CREATE TRIGGER audit_log_immutable_guard
BEFORE UPDATE OR DELETE ON public.audit_log
FOR EACH ROW EXECUTE FUNCTION private.prevent_immutable_mutation();
--> statement-breakpoint
DROP TRIGGER IF EXISTS security_events_immutable_guard ON public.security_events;
--> statement-breakpoint
CREATE TRIGGER security_events_immutable_guard
BEFORE UPDATE OR DELETE ON public.security_events
FOR EACH ROW EXECUTE FUNCTION private.prevent_immutable_mutation();
--> statement-breakpoint
DROP TRIGGER IF EXISTS profiles_touch_updated_at ON public.profiles;
--> statement-breakpoint
CREATE TRIGGER profiles_touch_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS roles_touch_updated_at ON public.roles;
--> statement-breakpoint
CREATE TRIGGER roles_touch_updated_at
BEFORE UPDATE ON public.roles
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS permissions_touch_updated_at ON public.permissions;
--> statement-breakpoint
CREATE TRIGGER permissions_touch_updated_at
BEFORE UPDATE ON public.permissions
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS role_permissions_touch_updated_at ON public.role_permissions;
--> statement-breakpoint
CREATE TRIGGER role_permissions_touch_updated_at
BEFORE UPDATE ON public.role_permissions
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS user_roles_touch_updated_at ON public.user_roles;
--> statement-breakpoint
CREATE TRIGGER user_roles_touch_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
--> statement-breakpoint
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.roles FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.permissions FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.role_permissions FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.consents FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.audit_log FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.security_events FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY profiles_select_policy ON public.profiles
FOR SELECT TO bonuvo_app
USING (
  (SELECT private.current_db_scope()) = 'auth_bootstrap'
  OR id = (SELECT private.current_actor_id())
  OR (SELECT private.has_permission('users.manage'))
);
--> statement-breakpoint
CREATE POLICY profiles_insert_policy ON public.profiles
FOR INSERT TO bonuvo_app
WITH CHECK (
  (SELECT private.current_db_scope()) = 'auth_bootstrap'
  OR id = (SELECT private.current_actor_id())
);
--> statement-breakpoint
CREATE POLICY profiles_update_policy ON public.profiles
FOR UPDATE TO bonuvo_app
USING (
  (SELECT private.current_db_scope()) = 'auth_bootstrap'
  OR id = (SELECT private.current_actor_id())
  OR (SELECT private.has_permission('users.manage'))
)
WITH CHECK (
  (SELECT private.current_db_scope()) = 'auth_bootstrap'
  OR id = (SELECT private.current_actor_id())
  OR (SELECT private.has_permission('users.manage'))
);
--> statement-breakpoint
CREATE POLICY roles_select_policy ON public.roles
FOR SELECT TO bonuvo_app
USING (
  (SELECT private.current_db_scope()) = 'auth_bootstrap'
  OR (SELECT private.current_actor_id()) IS NOT NULL
);
--> statement-breakpoint
CREATE POLICY permissions_select_policy ON public.permissions
FOR SELECT TO bonuvo_app
USING (
  (SELECT private.current_db_scope()) = 'auth_bootstrap'
  OR (SELECT private.current_actor_id()) IS NOT NULL
);
--> statement-breakpoint
CREATE POLICY role_permissions_select_policy ON public.role_permissions
FOR SELECT TO bonuvo_app
USING (
  (SELECT private.current_db_scope()) = 'auth_bootstrap'
  OR (SELECT private.current_actor_id()) IS NOT NULL
);
--> statement-breakpoint
CREATE POLICY user_roles_select_policy ON public.user_roles
FOR SELECT TO bonuvo_app
USING (
  (SELECT private.current_db_scope()) = 'auth_bootstrap'
  OR user_id = (SELECT private.current_actor_id())
  OR (SELECT private.has_permission('users.manage'))
);
--> statement-breakpoint
CREATE POLICY user_roles_insert_policy ON public.user_roles
FOR INSERT TO bonuvo_app
WITH CHECK (
  (
    (SELECT private.current_db_scope()) = 'auth_bootstrap'
    AND (SELECT private.role_is_member(role_id))
  )
  OR (
    (SELECT private.has_permission('users.manage'))
    AND (
      (SELECT private.has_role('super_admin'))
      OR (
        NOT (SELECT private.role_is_super_admin(role_id))
        AND NOT (SELECT private.user_is_super_admin(user_id))
      )
    )
  )
);
--> statement-breakpoint
CREATE POLICY user_roles_delete_policy ON public.user_roles
FOR DELETE TO bonuvo_app
USING (
  (SELECT private.has_permission('users.manage'))
  AND (
    (SELECT private.has_role('super_admin'))
    OR (
      NOT (SELECT private.role_is_super_admin(role_id))
      AND NOT (SELECT private.user_is_super_admin(user_id))
    )
  )
);
--> statement-breakpoint
CREATE POLICY consents_select_policy ON public.consents
FOR SELECT TO bonuvo_app
USING (
  user_id = (SELECT private.current_actor_id())
  OR (SELECT private.has_permission('users.manage'))
);
--> statement-breakpoint
CREATE POLICY consents_insert_policy ON public.consents
FOR INSERT TO bonuvo_app
WITH CHECK (
  (SELECT private.current_db_scope()) = 'auth_bootstrap'
  OR user_id = (SELECT private.current_actor_id())
);
--> statement-breakpoint
CREATE POLICY audit_log_select_policy ON public.audit_log
FOR SELECT TO bonuvo_app
USING ((SELECT private.has_permission('audit.read')));
--> statement-breakpoint
CREATE POLICY audit_log_insert_policy ON public.audit_log
FOR INSERT TO bonuvo_app
WITH CHECK (
  (SELECT private.current_db_scope()) = 'audit_writer'
  OR actor_id = (SELECT private.current_actor_id())
);
--> statement-breakpoint
CREATE POLICY security_events_select_policy ON public.security_events
FOR SELECT TO bonuvo_app
USING ((SELECT private.has_permission('audit.read')));
--> statement-breakpoint
CREATE POLICY security_events_insert_policy ON public.security_events
FOR INSERT TO bonuvo_app
WITH CHECK (
  (SELECT private.current_db_scope()) = 'audit_writer'
  OR user_id = (SELECT private.current_actor_id())
);
