CREATE TABLE "community_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" text NOT NULL,
	"country_code" varchar(8) DEFAULT 'GLOBAL' NOT NULL,
	"title_fr" text NOT NULL,
	"title_en" text DEFAULT '' NOT NULL,
	"description_fr" text DEFAULT '' NOT NULL,
	"description_en" text DEFAULT '' NOT NULL,
	"invite_url" text NOT NULL,
	"subscriber_count_label" text DEFAULT '' NOT NULL,
	"priority_order" integer DEFAULT 100 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "community_channels_platform_check" CHECK ("community_channels"."platform" IN ('telegram', 'whatsapp_channel', 'whatsapp_group'))
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title_fr" text NOT NULL,
	"title_en" text DEFAULT '' NOT NULL,
	"description_fr" text DEFAULT '' NOT NULL,
	"description_en" text DEFAULT '' NOT NULL,
	"country_code" varchar(8) DEFAULT 'GLOBAL' NOT NULL,
	"bookmaker_id" uuid,
	"coupon_code" text DEFAULT '' NOT NULL,
	"combined_odds" numeric(8, 2),
	"confidence_label" text DEFAULT 'medium' NOT NULL,
	"prediction_ids" uuid[] DEFAULT ARRAY[]::uuid[] NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"validated_by" uuid,
	"validated_at" timestamp with time zone,
	"published_to_telegram_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coupons_status_check" CHECK ("coupons"."status" IN ('draft', 'validated', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" uuid NOT NULL,
	"user_id" uuid,
	"channel" text DEFAULT 'email' NOT NULL,
	"status" text NOT NULL,
	"error_text" text DEFAULT '' NOT NULL,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_deliveries_status_check" CHECK ("notification_deliveries"."status" IN ('sent', 'skipped_no_consent', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title_fr" text NOT NULL,
	"title_en" text DEFAULT '' NOT NULL,
	"body_fr" text NOT NULL,
	"body_en" text DEFAULT '' NOT NULL,
	"target_country_code" varchar(8) DEFAULT 'GLOBAL' NOT NULL,
	"channel" text DEFAULT 'email' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_channel_check" CHECK ("notifications"."channel" IN ('email', 'telegram')),
	CONSTRAINT "notifications_status_check" CHECK ("notifications"."status" IN ('draft', 'queued', 'sent', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"post_type" text DEFAULT 'news' NOT NULL,
	"title_fr" text NOT NULL,
	"title_en" text DEFAULT '' NOT NULL,
	"excerpt_fr" text DEFAULT '' NOT NULL,
	"excerpt_en" text DEFAULT '' NOT NULL,
	"body_fr" text DEFAULT '' NOT NULL,
	"body_en" text DEFAULT '' NOT NULL,
	"country_code" varchar(8) DEFAULT 'GLOBAL' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"author_id" uuid,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "posts_type_check" CHECK ("posts"."post_type" IN ('announcement', 'news')),
	CONSTRAINT "posts_status_check" CHECK ("posts"."status" IN ('draft', 'published', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "account_deletion_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"scheduled_purge_at" timestamp with time zone NOT NULL,
	"cancelled_at" timestamp with time zone,
	"executed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_deletion_status_check" CHECK ("account_deletion_requests"."status" IN ('pending', 'cancelled', 'executed'))
);
--> statement-breakpoint
CREATE TABLE "communication_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"email_announcements" boolean DEFAULT false NOT NULL,
	"email_promos" boolean DEFAULT false NOT NULL,
	"email_predictions" boolean DEFAULT false NOT NULL,
	"preferred_channel" text DEFAULT 'email' NOT NULL,
	"unsubscribe_token_hash" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comm_prefs_channel_check" CHECK ("communication_preferences"."preferred_channel" IN ('email', 'telegram', 'whatsapp', 'none'))
);
--> statement-breakpoint
CREATE TABLE "member_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"activity_type" text NOT NULL,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_hash" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_activity_type_check" CHECK ("member_activity"."activity_type" IN ('profile_updated', 'preferences_updated', 'consent_recorded', 'data_exported', 'deletion_requested', 'deletion_cancelled', 'unsubscribed'))
);
--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_bookmaker_id_bookmakers_id_fk" FOREIGN KEY ("bookmaker_id") REFERENCES "public"."bookmakers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_validated_by_profiles_id_fk" FOREIGN KEY ("validated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_deletion_requests" ADD CONSTRAINT "account_deletion_requests_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_preferences" ADD CONSTRAINT "communication_preferences_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_activity" ADD CONSTRAINT "member_activity_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "community_channels_country_active_idx" ON "community_channels" USING btree ("country_code","active","priority_order");--> statement-breakpoint
CREATE INDEX "coupons_status_validated_idx" ON "coupons" USING btree ("status","validated_at");--> statement-breakpoint
CREATE INDEX "notification_deliveries_notif_idx" ON "notification_deliveries" USING btree ("notification_id","status");--> statement-breakpoint
CREATE INDEX "notification_deliveries_user_idx" ON "notification_deliveries" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_status_created_idx" ON "notifications" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "posts_slug_uidx" ON "posts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "posts_status_pub_idx" ON "posts" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "posts_country_status_idx" ON "posts" USING btree ("country_code","status");--> statement-breakpoint
CREATE INDEX "account_deletion_user_status_idx" ON "account_deletion_requests" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "account_deletion_purge_idx" ON "account_deletion_requests" USING btree ("status","scheduled_purge_at");--> statement-breakpoint
CREATE UNIQUE INDEX "comm_prefs_user_uidx" ON "communication_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "member_activity_user_created_idx" ON "member_activity" USING btree ("user_id","created_at");