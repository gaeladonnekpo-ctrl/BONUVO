CREATE TABLE "commission_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commission_id" uuid NOT NULL,
	"previous_status" text,
	"next_status" text NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"proof_reference" text DEFAULT '' NOT NULL,
	"changed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commission_history_next_check" CHECK ("commission_history"."next_status" IN ('pending', 'confirmed', 'rejected', 'paid'))
);
--> statement-breakpoint
CREATE TABLE "commissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversion_id" uuid,
	"import_id" uuid,
	"bookmaker_id" uuid NOT NULL,
	"model" text DEFAULT 'cpa' NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"period_label" text DEFAULT '' NOT NULL,
	"proof_reference" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commissions_source_ref_check" CHECK ("commissions"."conversion_id" IS NOT NULL OR "commissions"."import_id" IS NOT NULL),
	CONSTRAINT "commissions_model_check" CHECK ("commissions"."model" IN ('cpa', 'revshare', 'hybrid')),
	CONSTRAINT "commissions_status_check" CHECK ("commissions"."status" IN ('pending', 'confirmed', 'rejected', 'paid')),
	CONSTRAINT "commissions_amount_check" CHECK ("commissions"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "conversion_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"network_id" uuid,
	"bookmaker_id" uuid,
	"filename" text NOT NULL,
	"period_start" timestamp with time zone,
	"period_end" timestamp with time zone,
	"imported_by" uuid NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"accepted_rows" integer DEFAULT 0 NOT NULL,
	"rejected_rows" integer DEFAULT 0 NOT NULL,
	"rejection_report" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'committed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversion_imports_status_check" CHECK ("conversion_imports"."status" IN ('preview', 'committed', 'failed')),
	CONSTRAINT "conversion_imports_counts_check" CHECK ("conversion_imports"."total_rows" >= 0 AND "conversion_imports"."accepted_rows" >= 0 AND "conversion_imports"."rejected_rows" >= 0)
);
--> statement-breakpoint
CREATE TABLE "conversions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"network_id" uuid,
	"bookmaker_id" uuid NOT NULL,
	"offer_id" uuid,
	"country_id" uuid,
	"click_id" uuid,
	"promo_code_id" uuid,
	"postback_event_id" uuid,
	"import_id" uuid,
	"external_event_id" text DEFAULT '' NOT NULL,
	"external_player_id" text DEFAULT '' NOT NULL,
	"conversion_type" text NOT NULL,
	"attribution_mode" text NOT NULL,
	"source" text NOT NULL,
	"status" text DEFAULT 'recorded' NOT NULL,
	"amount" numeric(14, 2),
	"currency_code" varchar(3),
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversions_source_ref_check" CHECK ("conversions"."postback_event_id" IS NOT NULL OR "conversions"."import_id" IS NOT NULL),
	CONSTRAINT "conversions_type_check" CHECK ("conversions"."conversion_type" IN ('registration', 'first_deposit', 'qualified')),
	CONSTRAINT "conversions_attribution_check" CHECK ("conversions"."attribution_mode" IN ('click_id', 'promo_code', 'unattributed')),
	CONSTRAINT "conversions_source_check" CHECK ("conversions"."source" IN ('postback', 'webhook', 'import')),
	CONSTRAINT "conversions_status_check" CHECK ("conversions"."status" IN ('recorded', 'unattributed', 'rejected')),
	CONSTRAINT "conversions_amount_check" CHECK ("conversions"."amount" IS NULL OR "conversions"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "postback_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"network_id" uuid,
	"network_slug" text NOT NULL,
	"source_type" text DEFAULT 'postback' NOT NULL,
	"external_event_id" text DEFAULT '' NOT NULL,
	"raw_query" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"raw_headers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"raw_body" text DEFAULT '' NOT NULL,
	"signature_valid" boolean DEFAULT false NOT NULL,
	"processing_status" text DEFAULT 'received' NOT NULL,
	"rejection_reason" text DEFAULT '' NOT NULL,
	"click_id" uuid,
	"ip_hash" text DEFAULT '' NOT NULL,
	"event_timestamp" timestamp with time zone,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "postback_events_source_check" CHECK ("postback_events"."source_type" IN ('postback', 'webhook')),
	CONSTRAINT "postback_events_status_check" CHECK ("postback_events"."processing_status" IN ('received', 'processed', 'duplicate', 'rejected', 'replay'))
);
--> statement-breakpoint
ALTER TABLE "affiliate_networks" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "affiliate_networks" ADD COLUMN "bookmaker_id" uuid;--> statement-breakpoint
ALTER TABLE "affiliate_networks" ADD COLUMN "adapter_key" text DEFAULT 'generic' NOT NULL;--> statement-breakpoint
ALTER TABLE "affiliate_networks" ADD COLUMN "signature_mode" text DEFAULT 'token' NOT NULL;--> statement-breakpoint
ALTER TABLE "affiliate_networks" ADD COLUMN "signature_header" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "affiliate_networks" ADD COLUMN "allowed_ips" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "affiliate_networks" ADD COLUMN "timestamp_tolerance_seconds" integer DEFAULT 300 NOT NULL;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "bookmaker_id" uuid;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "offer_id" uuid;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "country_id" uuid;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "commission_history" ADD CONSTRAINT "commission_history_commission_id_commissions_id_fk" FOREIGN KEY ("commission_id") REFERENCES "public"."commissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_history" ADD CONSTRAINT "commission_history_changed_by_profiles_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_conversion_id_conversions_id_fk" FOREIGN KEY ("conversion_id") REFERENCES "public"."conversions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_import_id_conversion_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."conversion_imports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_bookmaker_id_bookmakers_id_fk" FOREIGN KEY ("bookmaker_id") REFERENCES "public"."bookmakers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversion_imports" ADD CONSTRAINT "conversion_imports_network_id_affiliate_networks_id_fk" FOREIGN KEY ("network_id") REFERENCES "public"."affiliate_networks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversion_imports" ADD CONSTRAINT "conversion_imports_bookmaker_id_bookmakers_id_fk" FOREIGN KEY ("bookmaker_id") REFERENCES "public"."bookmakers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversion_imports" ADD CONSTRAINT "conversion_imports_imported_by_profiles_id_fk" FOREIGN KEY ("imported_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversions" ADD CONSTRAINT "conversions_network_id_affiliate_networks_id_fk" FOREIGN KEY ("network_id") REFERENCES "public"."affiliate_networks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversions" ADD CONSTRAINT "conversions_bookmaker_id_bookmakers_id_fk" FOREIGN KEY ("bookmaker_id") REFERENCES "public"."bookmakers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversions" ADD CONSTRAINT "conversions_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversions" ADD CONSTRAINT "conversions_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversions" ADD CONSTRAINT "conversions_click_id_clicks_id_fk" FOREIGN KEY ("click_id") REFERENCES "public"."clicks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversions" ADD CONSTRAINT "conversions_promo_code_id_promo_codes_id_fk" FOREIGN KEY ("promo_code_id") REFERENCES "public"."promo_codes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversions" ADD CONSTRAINT "conversions_postback_event_id_postback_events_id_fk" FOREIGN KEY ("postback_event_id") REFERENCES "public"."postback_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversions" ADD CONSTRAINT "conversions_import_id_conversion_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."conversion_imports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postback_events" ADD CONSTRAINT "postback_events_network_id_affiliate_networks_id_fk" FOREIGN KEY ("network_id") REFERENCES "public"."affiliate_networks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postback_events" ADD CONSTRAINT "postback_events_click_id_clicks_id_fk" FOREIGN KEY ("click_id") REFERENCES "public"."clicks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "commission_history_comm_idx" ON "commission_history" USING btree ("commission_id","created_at");--> statement-breakpoint
CREATE INDEX "commissions_status_idx" ON "commissions" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "commissions_bm_period_idx" ON "commissions" USING btree ("bookmaker_id","period_label");--> statement-breakpoint
CREATE INDEX "conversion_imports_created_idx" ON "conversion_imports" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "conversions_network_external_uidx" ON "conversions" USING btree ("network_id","external_event_id") WHERE "conversions"."network_id" IS NOT NULL AND "conversions"."external_event_id" <> '';--> statement-breakpoint
CREATE UNIQUE INDEX "conversions_postback_uidx" ON "conversions" USING btree ("postback_event_id") WHERE "conversions"."postback_event_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "conversions_occurred_idx" ON "conversions" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "conversions_bm_type_idx" ON "conversions" USING btree ("bookmaker_id","conversion_type","occurred_at");--> statement-breakpoint
CREATE INDEX "conversions_click_idx" ON "conversions" USING btree ("click_id");--> statement-breakpoint
CREATE INDEX "postback_events_created_idx" ON "postback_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "postback_events_network_idx" ON "postback_events" USING btree ("network_id","created_at");--> statement-breakpoint
CREATE INDEX "postback_events_status_idx" ON "postback_events" USING btree ("processing_status","created_at");--> statement-breakpoint
ALTER TABLE "affiliate_networks" ADD CONSTRAINT "affiliate_networks_bookmaker_id_bookmakers_id_fk" FOREIGN KEY ("bookmaker_id") REFERENCES "public"."bookmakers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_bookmaker_id_bookmakers_id_fk" FOREIGN KEY ("bookmaker_id") REFERENCES "public"."bookmakers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "affiliate_networks_bm_idx" ON "affiliate_networks" USING btree ("bookmaker_id");--> statement-breakpoint
CREATE INDEX "campaigns_bm_idx" ON "campaigns" USING btree ("bookmaker_id");--> statement-breakpoint
ALTER TABLE "affiliate_networks" ADD CONSTRAINT "affiliate_networks_slug_unique" UNIQUE("slug");--> statement-breakpoint
ALTER TABLE "affiliate_networks" ADD CONSTRAINT "affiliate_networks_adapter_check" CHECK ("affiliate_networks"."adapter_key" IN ('1xpartners', '1win', 'generic'));--> statement-breakpoint
ALTER TABLE "affiliate_networks" ADD CONSTRAINT "affiliate_networks_sig_mode_check" CHECK ("affiliate_networks"."signature_mode" IN ('token', 'hmac_sha256', 'none'));--> statement-breakpoint
ALTER TABLE "affiliate_networks" ADD CONSTRAINT "affiliate_networks_ts_tol_check" CHECK ("affiliate_networks"."timestamp_tolerance_seconds" >= 30 AND "affiliate_networks"."timestamp_tolerance_seconds" <= 3600);