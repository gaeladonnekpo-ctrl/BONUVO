CREATE TABLE "daily_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dimension_key" text NOT NULL,
	"grain" text NOT NULL,
	"metric_date" date NOT NULL,
	"country_code" varchar(8) DEFAULT 'GLOBAL' NOT NULL,
	"bookmaker_id" uuid,
	"offer_id" uuid,
	"campaign_id" uuid,
	"unique_visitors" integer DEFAULT 0 NOT NULL,
	"page_views" integer DEFAULT 0 NOT NULL,
	"offer_views" integer DEFAULT 0 NOT NULL,
	"promo_copies" integer DEFAULT 0 NOT NULL,
	"raw_clicks" integer DEFAULT 0 NOT NULL,
	"valid_clicks" integer DEFAULT 0 NOT NULL,
	"registrations" integer DEFAULT 0 NOT NULL,
	"first_deposits" integer DEFAULT 0 NOT NULL,
	"qualified_conversions" integer DEFAULT 0 NOT NULL,
	"confirmed_commissions_count" integer DEFAULT 0 NOT NULL,
	"confirmed_commissions_eur" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"pending_commissions_eur" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"aggregated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_metrics_dimension_key_unique" UNIQUE("dimension_key"),
	CONSTRAINT "daily_metrics_grain_check" CHECK ("daily_metrics"."grain" IN ('day_total', 'day_country', 'breakdown')),
	CONSTRAINT "daily_metrics_nonneg_check" CHECK ("daily_metrics"."unique_visitors" >= 0 AND "daily_metrics"."page_views" >= 0 AND "daily_metrics"."offer_views" >= 0 AND "daily_metrics"."promo_copies" >= 0 AND "daily_metrics"."raw_clicks" >= 0 AND "daily_metrics"."valid_clicks" >= 0 AND "daily_metrics"."registrations" >= 0 AND "daily_metrics"."first_deposits" >= 0 AND "daily_metrics"."qualified_conversions" >= 0 AND "daily_metrics"."confirmed_commissions_count" >= 0 AND "daily_metrics"."confirmed_commissions_eur" >= 0 AND "daily_metrics"."pending_commissions_eur" >= 0)
);
--> statement-breakpoint
ALTER TABLE "daily_metrics" ADD CONSTRAINT "daily_metrics_bookmaker_id_bookmakers_id_fk" FOREIGN KEY ("bookmaker_id") REFERENCES "public"."bookmakers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_metrics" ADD CONSTRAINT "daily_metrics_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_metrics" ADD CONSTRAINT "daily_metrics_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_metrics_grain_date_idx" ON "daily_metrics" USING btree ("grain","metric_date");--> statement-breakpoint
CREATE INDEX "daily_metrics_country_date_idx" ON "daily_metrics" USING btree ("grain","country_code","metric_date");--> statement-breakpoint
CREATE INDEX "daily_metrics_bm_date_idx" ON "daily_metrics" USING btree ("grain","bookmaker_id","metric_date");--> statement-breakpoint
CREATE INDEX "daily_metrics_campaign_date_idx" ON "daily_metrics" USING btree ("grain","campaign_id","metric_date");--> statement-breakpoint
CREATE INDEX "conversions_country_occurred_idx" ON "conversions" USING btree ("country_id","occurred_at");--> statement-breakpoint
CREATE INDEX "conversions_offer_occurred_idx" ON "conversions" USING btree ("offer_id","occurred_at");--> statement-breakpoint
CREATE INDEX "clicks_country_created_idx" ON "clicks" USING btree ("country_code","created_at");--> statement-breakpoint
CREATE INDEX "clicks_campaign_created_idx" ON "clicks" USING btree ("campaign_id","created_at");--> statement-breakpoint
CREATE INDEX "visit_events_country_created_idx" ON "visit_events" USING btree ("country_code","created_at");