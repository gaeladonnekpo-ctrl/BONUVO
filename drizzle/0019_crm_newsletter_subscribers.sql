CREATE TABLE IF NOT EXISTS "newsletter_subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"country_code" text DEFAULT 'GLOBAL' NOT NULL,
	"locale" text DEFAULT 'fr' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"consent_granted" boolean DEFAULT true NOT NULL,
	"consent_policy_version" text DEFAULT '1.0' NOT NULL,
	"consent_recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unsubscribed_at" timestamp with time zone,
	"source" text DEFAULT 'home_newsletter' NOT NULL,
	"ip_hash" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_subscribers_status_check" CHECK ("newsletter_subscribers"."status" IN ('active', 'unsubscribed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "newsletter_subscribers_email_uidx" ON "newsletter_subscribers" USING btree ("email");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "newsletter_subscribers_status_country_idx" ON "newsletter_subscribers" USING btree ("status","country_code");
--> statement-breakpoint
REVOKE ALL ON TABLE public.newsletter_subscribers FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.newsletter_subscribers TO bonuvo_app;
--> statement-breakpoint
DROP TRIGGER IF EXISTS newsletter_subscribers_touch_updated_at ON public.newsletter_subscribers;
--> statement-breakpoint
CREATE TRIGGER newsletter_subscribers_touch_updated_at
BEFORE UPDATE ON public.newsletter_subscribers
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
--> statement-breakpoint
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.newsletter_subscribers FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS newsletter_subscribers_select_policy ON public.newsletter_subscribers;
--> statement-breakpoint
CREATE POLICY newsletter_subscribers_select_policy ON public.newsletter_subscribers
FOR SELECT TO bonuvo_app
USING (
  (SELECT private.current_db_scope()) IN ('public_tracking', 'public_unsubscribe', 'purge_worker')
  OR (SELECT private.has_permission('community.manage'))
  OR (SELECT private.has_permission('users.manage'))
);
--> statement-breakpoint
DROP POLICY IF EXISTS newsletter_subscribers_insert_policy ON public.newsletter_subscribers;
--> statement-breakpoint
CREATE POLICY newsletter_subscribers_insert_policy ON public.newsletter_subscribers
FOR INSERT TO bonuvo_app
WITH CHECK (
  (
    (SELECT private.current_db_scope()) = 'public_tracking'
    AND consent_granted = true
    AND status = 'active'
  )
  OR (SELECT private.has_permission('community.manage'))
  OR (SELECT private.has_permission('users.manage'))
);
--> statement-breakpoint
DROP POLICY IF EXISTS newsletter_subscribers_update_policy ON public.newsletter_subscribers;
--> statement-breakpoint
CREATE POLICY newsletter_subscribers_update_policy ON public.newsletter_subscribers
FOR UPDATE TO bonuvo_app
USING (
  (SELECT private.current_db_scope()) IN ('public_tracking', 'public_unsubscribe', 'purge_worker')
  OR (SELECT private.has_permission('community.manage'))
  OR (SELECT private.has_permission('users.manage'))
)
WITH CHECK (
  (SELECT private.current_db_scope()) IN ('public_tracking', 'public_unsubscribe', 'purge_worker')
  OR (SELECT private.has_permission('community.manage'))
  OR (SELECT private.has_permission('users.manage'))
);
--> statement-breakpoint
DROP POLICY IF EXISTS newsletter_subscribers_delete_policy ON public.newsletter_subscribers;
--> statement-breakpoint
CREATE POLICY newsletter_subscribers_delete_policy ON public.newsletter_subscribers
FOR DELETE TO bonuvo_app
USING (
  (SELECT private.has_permission('community.manage'))
  OR (SELECT private.has_permission('users.manage'))
);
