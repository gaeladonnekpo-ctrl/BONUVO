CREATE TABLE "countries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(8) NOT NULL,
	"name_fr" text NOT NULL,
	"name_en" text NOT NULL,
	"currency_code" varchar(3) DEFAULT 'EUR' NOT NULL,
	"default_locale" varchar(5) DEFAULT 'fr' NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "countries_code_unique" UNIQUE("code"),
	CONSTRAINT "countries_locale_check" CHECK ("countries"."default_locale" IN ('fr', 'en'))
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage_bucket" text NOT NULL,
	"storage_path" text NOT NULL,
	"public_url" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"sha256" text NOT NULL,
	"alt_text" text DEFAULT '' NOT NULL,
	"uploaded_by" uuid,
	"status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_assets_storage_path_unique" UNIQUE("storage_path"),
	CONSTRAINT "media_assets_mime_check" CHECK ("media_assets"."mime_type" IN ('image/png', 'image/jpeg', 'image/webp')),
	CONSTRAINT "media_assets_size_check" CHECK ("media_assets"."size_bytes" > 0 AND "media_assets"."size_bytes" <= 2097152),
	CONSTRAINT "media_assets_status_check" CHECK ("media_assets"."status" IN ('active', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'mobile_money' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_methods_slug_unique" UNIQUE("slug"),
	CONSTRAINT "payment_methods_name_unique" UNIQUE("name"),
	CONSTRAINT "payment_methods_category_check" CHECK ("payment_methods"."category" IN ('mobile_money', 'card', 'bank_transfer', 'e_wallet', 'crypto', 'voucher'))
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "bookmaker_countries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bookmaker_id" uuid NOT NULL,
	"country_id" uuid NOT NULL,
	"eligible" boolean DEFAULT true NOT NULL,
	"local_license" text DEFAULT '' NOT NULL,
	"authority_name" text DEFAULT '' NOT NULL,
	"country_score" numeric(4, 2),
	"notes" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookmaker_countries_status_check" CHECK ("bookmaker_countries"."status" IN ('active', 'archived')),
	CONSTRAINT "bookmaker_countries_score_check" CHECK ("bookmaker_countries"."country_score" IS NULL OR ("bookmaker_countries"."country_score" >= 0 AND "bookmaker_countries"."country_score" <= 10))
);
--> statement-breakpoint
CREATE TABLE "bookmaker_payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bookmaker_id" uuid NOT NULL,
	"payment_method_id" uuid NOT NULL,
	"country_id" uuid NOT NULL,
	"min_deposit_amount" numeric(14, 2),
	"currency_code" varchar(3) DEFAULT 'XOF' NOT NULL,
	"supports_deposit" boolean DEFAULT true NOT NULL,
	"supports_withdrawal" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookmaker_payment_methods_min_check" CHECK ("bookmaker_payment_methods"."min_deposit_amount" IS NULL OR "bookmaker_payment_methods"."min_deposit_amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "bookmaker_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bookmaker_id" uuid NOT NULL,
	"grid_version" text DEFAULT 'v1' NOT NULL,
	"bonus_score" numeric(4, 2) NOT NULL,
	"payments_score" numeric(4, 2) NOT NULL,
	"odds_score" numeric(4, 2) NOT NULL,
	"app_score" numeric(4, 2) NOT NULL,
	"support_score" numeric(4, 2) NOT NULL,
	"final_score" numeric(4, 2) NOT NULL,
	"scored_by" uuid,
	"scored_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookmaker_ratings_range_check" CHECK ("bookmaker_ratings"."bonus_score" >= 0 AND "bookmaker_ratings"."bonus_score" <= 10 AND "bookmaker_ratings"."payments_score" >= 0 AND "bookmaker_ratings"."payments_score" <= 10 AND "bookmaker_ratings"."odds_score" >= 0 AND "bookmaker_ratings"."odds_score" <= 10 AND "bookmaker_ratings"."app_score" >= 0 AND "bookmaker_ratings"."app_score" <= 10 AND "bookmaker_ratings"."support_score" >= 0 AND "bookmaker_ratings"."support_score" <= 10 AND "bookmaker_ratings"."final_score" >= 0 AND "bookmaker_ratings"."final_score" <= 10)
);
--> statement-breakpoint
CREATE TABLE "bookmakers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo_asset_id" uuid,
	"description_fr" text DEFAULT '' NOT NULL,
	"description_en" text DEFAULT '' NOT NULL,
	"founded_year" integer,
	"app_platforms" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"allowed_hosts" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookmakers_slug_unique" UNIQUE("slug"),
	CONSTRAINT "bookmakers_status_check" CHECK ("bookmakers"."status" IN ('active', 'inactive', 'archived')),
	CONSTRAINT "bookmakers_founded_year_check" CHECK ("bookmakers"."founded_year" IS NULL OR ("bookmakers"."founded_year" >= 1900 AND "bookmakers"."founded_year" <= 2100))
);
--> statement-breakpoint
CREATE TABLE "offer_countries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" uuid NOT NULL,
	"country_id" uuid NOT NULL,
	"rank_override" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offer_highlights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" uuid NOT NULL,
	"locale" varchar(5) DEFAULT 'fr' NOT NULL,
	"polarity" text DEFAULT 'positive' NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "offer_highlights_locale_check" CHECK ("offer_highlights"."locale" IN ('fr', 'en')),
	CONSTRAINT "offer_highlights_polarity_check" CHECK ("offer_highlights"."polarity" IN ('positive', 'negative')),
	CONSTRAINT "offer_highlights_status_check" CHECK ("offer_highlights"."status" IN ('active', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "offer_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" uuid NOT NULL,
	"locale" varchar(5) DEFAULT 'fr' NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "offer_terms_locale_check" CHECK ("offer_terms"."locale" IN ('fr', 'en')),
	CONSTRAINT "offer_terms_status_check" CHECK ("offer_terms"."status" IN ('active', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bookmaker_id" uuid NOT NULL,
	"offer_type" text DEFAULT 'welcome' NOT NULL,
	"slug" text NOT NULL,
	"title_fr" text NOT NULL,
	"title_en" text NOT NULL,
	"bonus_amount" numeric(14, 2),
	"currency_code" varchar(3) DEFAULT 'XOF' NOT NULL,
	"bonus_percentage" integer,
	"min_deposit" numeric(14, 2),
	"rollover_text" text DEFAULT '' NOT NULL,
	"min_odds" numeric(6, 2),
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"last_verified_at" timestamp with time zone,
	"verified_by" uuid,
	"badge_code" text,
	"rank_order" integer DEFAULT 100 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "offers_slug_unique" UNIQUE("slug"),
	CONSTRAINT "offers_type_check" CHECK ("offers"."offer_type" IN ('welcome', 'special', 'reload', 'cashback')),
	CONSTRAINT "offers_status_check" CHECK ("offers"."status" IN ('draft', 'published', 'expired', 'disabled', 'archived')),
	CONSTRAINT "offers_amounts_check" CHECK (("offers"."bonus_amount" IS NULL OR "offers"."bonus_amount" >= 0) AND ("offers"."min_deposit" IS NULL OR "offers"."min_deposit" >= 0) AND ("offers"."bonus_percentage" IS NULL OR "offers"."bonus_percentage" >= 0)),
	CONSTRAINT "offers_dates_check" CHECK ("offers"."valid_until" IS NULL OR "offers"."valid_from" IS NULL OR "offers"."valid_until" > "offers"."valid_from")
);
--> statement-breakpoint
CREATE TABLE "promo_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bookmaker_id" uuid NOT NULL,
	"offer_id" uuid,
	"country_id" uuid,
	"code" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promo_codes_status_check" CHECK ("promo_codes"."status" IN ('active', 'expired', 'disabled', 'archived')),
	CONSTRAINT "promo_codes_dates_check" CHECK ("promo_codes"."valid_until" IS NULL OR "promo_codes"."valid_from" IS NULL OR "promo_codes"."valid_until" > "promo_codes"."valid_from")
);
--> statement-breakpoint
CREATE TABLE "affiliate_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"bookmaker_id" uuid NOT NULL,
	"country_id" uuid,
	"offer_id" uuid,
	"network_id" uuid,
	"destination_url" text NOT NULL,
	"allowed_host" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "affiliate_links_slug_unique" UNIQUE("slug"),
	CONSTRAINT "affiliate_links_https_check" CHECK ("affiliate_links"."destination_url" LIKE 'https://%'),
	CONSTRAINT "affiliate_links_status_check" CHECK ("affiliate_links"."status" IN ('active', 'disabled', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "affiliate_networks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"tracking_mode" text DEFAULT 'none' NOT NULL,
	"sub_id_param_name" text DEFAULT 'subid' NOT NULL,
	"secret_env_ref" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "affiliate_networks_name_unique" UNIQUE("name"),
	CONSTRAINT "affiliate_networks_mode_check" CHECK ("affiliate_networks"."tracking_mode" IN ('postback', 'webhook', 'import', 'none')),
	CONSTRAINT "affiliate_networks_status_check" CHECK ("affiliate_networks"."status" IN ('active', 'inactive'))
);
--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploaded_by_profiles_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmaker_countries" ADD CONSTRAINT "bookmaker_countries_bookmaker_id_bookmakers_id_fk" FOREIGN KEY ("bookmaker_id") REFERENCES "public"."bookmakers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmaker_countries" ADD CONSTRAINT "bookmaker_countries_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmaker_payment_methods" ADD CONSTRAINT "bookmaker_payment_methods_bookmaker_id_bookmakers_id_fk" FOREIGN KEY ("bookmaker_id") REFERENCES "public"."bookmakers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmaker_payment_methods" ADD CONSTRAINT "bookmaker_payment_methods_payment_method_id_payment_methods_id_fk" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmaker_payment_methods" ADD CONSTRAINT "bookmaker_payment_methods_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmaker_ratings" ADD CONSTRAINT "bookmaker_ratings_bookmaker_id_bookmakers_id_fk" FOREIGN KEY ("bookmaker_id") REFERENCES "public"."bookmakers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmaker_ratings" ADD CONSTRAINT "bookmaker_ratings_scored_by_profiles_id_fk" FOREIGN KEY ("scored_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmakers" ADD CONSTRAINT "bookmakers_logo_asset_id_media_assets_id_fk" FOREIGN KEY ("logo_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_countries" ADD CONSTRAINT "offer_countries_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_countries" ADD CONSTRAINT "offer_countries_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_highlights" ADD CONSTRAINT "offer_highlights_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_terms" ADD CONSTRAINT "offer_terms_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_bookmaker_id_bookmakers_id_fk" FOREIGN KEY ("bookmaker_id") REFERENCES "public"."bookmakers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_verified_by_profiles_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_bookmaker_id_bookmakers_id_fk" FOREIGN KEY ("bookmaker_id") REFERENCES "public"."bookmakers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_bookmaker_id_bookmakers_id_fk" FOREIGN KEY ("bookmaker_id") REFERENCES "public"."bookmakers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_network_id_affiliate_networks_id_fk" FOREIGN KEY ("network_id") REFERENCES "public"."affiliate_networks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "countries_active_idx" ON "countries" USING btree ("active");--> statement-breakpoint
CREATE INDEX "media_assets_uploaded_by_idx" ON "media_assets" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "media_assets_status_idx" ON "media_assets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "settings_updated_by_idx" ON "settings" USING btree ("updated_by");--> statement-breakpoint
CREATE UNIQUE INDEX "bookmaker_countries_uidx" ON "bookmaker_countries" USING btree ("bookmaker_id","country_id");--> statement-breakpoint
CREATE INDEX "bookmaker_countries_bookmaker_idx" ON "bookmaker_countries" USING btree ("bookmaker_id");--> statement-breakpoint
CREATE INDEX "bookmaker_countries_country_idx" ON "bookmaker_countries" USING btree ("country_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bookmaker_payment_methods_uidx" ON "bookmaker_payment_methods" USING btree ("bookmaker_id","payment_method_id","country_id");--> statement-breakpoint
CREATE INDEX "bookmaker_payment_methods_bm_idx" ON "bookmaker_payment_methods" USING btree ("bookmaker_id");--> statement-breakpoint
CREATE INDEX "bookmaker_payment_methods_pm_idx" ON "bookmaker_payment_methods" USING btree ("payment_method_id");--> statement-breakpoint
CREATE INDEX "bookmaker_payment_methods_country_idx" ON "bookmaker_payment_methods" USING btree ("country_id");--> statement-breakpoint
CREATE INDEX "bookmaker_ratings_bm_idx" ON "bookmaker_ratings" USING btree ("bookmaker_id");--> statement-breakpoint
CREATE INDEX "bookmaker_ratings_scored_by_idx" ON "bookmaker_ratings" USING btree ("scored_by");--> statement-breakpoint
CREATE INDEX "bookmakers_logo_asset_id_idx" ON "bookmakers" USING btree ("logo_asset_id");--> statement-breakpoint
CREATE INDEX "bookmakers_status_idx" ON "bookmakers" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "offer_countries_uidx" ON "offer_countries" USING btree ("offer_id","country_id");--> statement-breakpoint
CREATE INDEX "offer_countries_offer_idx" ON "offer_countries" USING btree ("offer_id");--> statement-breakpoint
CREATE INDEX "offer_countries_country_idx" ON "offer_countries" USING btree ("country_id");--> statement-breakpoint
CREATE INDEX "offer_highlights_offer_idx" ON "offer_highlights" USING btree ("offer_id");--> statement-breakpoint
CREATE INDEX "offer_terms_offer_idx" ON "offer_terms" USING btree ("offer_id");--> statement-breakpoint
CREATE INDEX "offers_bookmaker_id_idx" ON "offers" USING btree ("bookmaker_id");--> statement-breakpoint
CREATE INDEX "offers_status_idx" ON "offers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "offers_verified_by_idx" ON "offers" USING btree ("verified_by");--> statement-breakpoint
CREATE INDEX "offers_last_verified_idx" ON "offers" USING btree ("last_verified_at");--> statement-breakpoint
CREATE UNIQUE INDEX "promo_codes_bm_code_uidx" ON "promo_codes" USING btree ("bookmaker_id","code");--> statement-breakpoint
CREATE INDEX "promo_codes_offer_idx" ON "promo_codes" USING btree ("offer_id");--> statement-breakpoint
CREATE INDEX "promo_codes_country_idx" ON "promo_codes" USING btree ("country_id");--> statement-breakpoint
CREATE INDEX "affiliate_links_bm_idx" ON "affiliate_links" USING btree ("bookmaker_id");--> statement-breakpoint
CREATE INDEX "affiliate_links_country_idx" ON "affiliate_links" USING btree ("country_id");--> statement-breakpoint
CREATE INDEX "affiliate_links_offer_idx" ON "affiliate_links" USING btree ("offer_id");--> statement-breakpoint
CREATE INDEX "affiliate_links_network_idx" ON "affiliate_links" USING btree ("network_id");--> statement-breakpoint
CREATE INDEX "affiliate_links_active_idx" ON "affiliate_links" USING btree ("active","status");