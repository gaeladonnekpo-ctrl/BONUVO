CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"source" text DEFAULT 'direct' NOT NULL,
	"medium" text DEFAULT 'organic' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaigns_code_unique" UNIQUE("code"),
	CONSTRAINT "campaigns_status_check" CHECK ("campaigns"."status" IN ('active', 'inactive', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "clicks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_click_id" text NOT NULL,
	"affiliate_link_id" uuid NOT NULL,
	"bookmaker_id" uuid NOT NULL,
	"offer_id" uuid,
	"country_id" uuid,
	"campaign_id" uuid,
	"campaign_code" text,
	"country_code" varchar(8) DEFAULT 'GLOBAL' NOT NULL,
	"device_type" text DEFAULT 'unknown' NOT NULL,
	"referrer_host" text DEFAULT '' NOT NULL,
	"ip_hash" text NOT NULL,
	"anon_session_hash" text NOT NULL,
	"is_bot" boolean DEFAULT false NOT NULL,
	"is_suspect" boolean DEFAULT false NOT NULL,
	"bot_reason" text DEFAULT '' NOT NULL,
	"user_agent" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clicks_public_click_id_unique" UNIQUE("public_click_id"),
	CONSTRAINT "clicks_device_check" CHECK ("clicks"."device_type" IN ('mobile', 'tablet', 'desktop', 'bot', 'unknown'))
);
--> statement-breakpoint
CREATE TABLE "visit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"path" text NOT NULL,
	"offer_id" uuid,
	"bookmaker_id" uuid,
	"promo_code_id" uuid,
	"country_code" varchar(8) DEFAULT 'GLOBAL' NOT NULL,
	"device_type" text DEFAULT 'unknown' NOT NULL,
	"visitor_daily_hash" text NOT NULL,
	"is_bot" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "visit_events_type_check" CHECK ("visit_events"."event_type" IN ('page_view', 'offer_view', 'promo_copy')),
	CONSTRAINT "visit_events_device_check" CHECK ("visit_events"."device_type" IN ('mobile', 'tablet', 'desktop', 'bot', 'unknown'))
);
--> statement-breakpoint
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_affiliate_link_id_affiliate_links_id_fk" FOREIGN KEY ("affiliate_link_id") REFERENCES "public"."affiliate_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_bookmaker_id_bookmakers_id_fk" FOREIGN KEY ("bookmaker_id") REFERENCES "public"."bookmakers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_events" ADD CONSTRAINT "visit_events_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_events" ADD CONSTRAINT "visit_events_bookmaker_id_bookmakers_id_fk" FOREIGN KEY ("bookmaker_id") REFERENCES "public"."bookmakers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_events" ADD CONSTRAINT "visit_events_promo_code_id_promo_codes_id_fk" FOREIGN KEY ("promo_code_id") REFERENCES "public"."promo_codes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaigns_status_idx" ON "campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "clicks_created_at_idx" ON "clicks" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "clicks_link_created_idx" ON "clicks" USING btree ("affiliate_link_id","created_at");--> statement-breakpoint
CREATE INDEX "clicks_bookmaker_created_idx" ON "clicks" USING btree ("bookmaker_id","created_at");--> statement-breakpoint
CREATE INDEX "clicks_bot_suspect_idx" ON "clicks" USING btree ("is_bot","is_suspect");--> statement-breakpoint
CREATE INDEX "visit_events_created_at_idx" ON "visit_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "visit_events_type_created_idx" ON "visit_events" USING btree ("event_type","created_at");--> statement-breakpoint
CREATE INDEX "visit_events_offer_idx" ON "visit_events" USING btree ("offer_id");