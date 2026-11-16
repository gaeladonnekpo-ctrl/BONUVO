-- Avoid dependency on auth schema ACL for least-privilege role bonuvo_app
CREATE OR REPLACE FUNCTION private.current_actor_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.current_user_id', true), '')::uuid,
    NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid,
    NULLIF((NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'), '')::uuid
  );
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION private.current_actor_id() FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION private.current_actor_id() TO bonuvo_app;
