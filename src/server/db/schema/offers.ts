import "server-only";

import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { profiles } from "./auth";
import { bookmakers } from "./bookmakers";
import { countries } from "./catalog-reference";

export const OFFER_TYPES = ["welcome", "special", "reload", "cashback"] as const;
export type OfferType = (typeof OFFER_TYPES)[number];

export const OFFER_STATUSES = ["draft", "published", "expired", "disabled", "archived"] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const PROMO_CODE_STATUSES = ["active", "expired", "disabled", "archived"] as const;
export type PromoCodeStatus = (typeof PROMO_CODE_STATUSES)[number];

export const HIGHLIGHT_POLARITIES = ["positive", "negative"] as const;
export type HighlightPolarity = (typeof HIGHLIGHT_POLARITIES)[number];

export const offers = pgTable(
  "offers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookmakerId: uuid("bookmaker_id")
      .notNull()
      .references(() => bookmakers.id, { onDelete: "cascade" }),
    offerType: text("offer_type").$type<OfferType>().notNull().default("welcome"),
    slug: text("slug").notNull().unique(),
    titleFr: text("title_fr").notNull(),
    titleEn: text("title_en").notNull(),
    bonusAmount: numeric("bonus_amount", { precision: 14, scale: 2 }),
    currencyCode: varchar("currency_code", { length: 3 }).notNull().default("XOF"),
    bonusPercentage: integer("bonus_percentage"),
    minDeposit: numeric("min_deposit", { precision: 14, scale: 2 }),
    rolloverText: text("rollover_text").notNull().default(""),
    minOdds: numeric("min_odds", { precision: 6, scale: 2 }),
    validFrom: timestamp("valid_from", { withTimezone: true, mode: "date" }),
    validUntil: timestamp("valid_until", { withTimezone: true, mode: "date" }),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true, mode: "date" }),
    verifiedBy: uuid("verified_by").references(() => profiles.id, { onDelete: "set null" }),
    badgeCode: text("badge_code"),
    badgeJustification: text("badge_justification").notNull().default(""),
    rankOrder: integer("rank_order").notNull().default(100),
    status: text("status").$type<OfferStatus>().notNull().default("draft"),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("offers_bookmaker_id_idx").on(table.bookmakerId),
    index("offers_status_idx").on(table.status),
    index("offers_verified_by_idx").on(table.verifiedBy),
    index("offers_last_verified_idx").on(table.lastVerifiedAt),
    check(
      "offers_type_check",
      sql`${table.offerType} IN ('welcome', 'special', 'reload', 'cashback')`,
    ),
    check(
      "offers_status_check",
      sql`${table.status} IN ('draft', 'published', 'expired', 'disabled', 'archived')`,
    ),
    check(
      "offers_amounts_check",
      sql`(${table.bonusAmount} IS NULL OR ${table.bonusAmount} >= 0) AND (${table.minDeposit} IS NULL OR ${table.minDeposit} >= 0) AND (${table.bonusPercentage} IS NULL OR ${table.bonusPercentage} >= 0)`,
    ),
    check(
      "offers_dates_check",
      sql`${table.validUntil} IS NULL OR ${table.validFrom} IS NULL OR ${table.validUntil} > ${table.validFrom}`,
    ),
  ],
);

export const offerCountries = pgTable(
  "offer_countries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    offerId: uuid("offer_id")
      .notNull()
      .references(() => offers.id, { onDelete: "cascade" }),
    countryId: uuid("country_id")
      .notNull()
      .references(() => countries.id, { onDelete: "cascade" }),
    rankOverride: integer("rank_override"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("offer_countries_uidx").on(table.offerId, table.countryId),
    index("offer_countries_offer_idx").on(table.offerId),
    index("offer_countries_country_idx").on(table.countryId),
  ],
);

export const offerTerms = pgTable(
  "offer_terms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    offerId: uuid("offer_id")
      .notNull()
      .references(() => offers.id, { onDelete: "cascade" }),
    locale: varchar("locale", { length: 5 }).notNull().default("fr"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    status: text("status").notNull().default("active"),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("offer_terms_offer_idx").on(table.offerId),
    check("offer_terms_locale_check", sql`${table.locale} IN ('fr', 'en')`),
    check("offer_terms_status_check", sql`${table.status} IN ('active', 'archived')`),
  ],
);

export const offerHighlights = pgTable(
  "offer_highlights",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    offerId: uuid("offer_id")
      .notNull()
      .references(() => offers.id, { onDelete: "cascade" }),
    locale: varchar("locale", { length: 5 }).notNull().default("fr"),
    polarity: text("polarity").$type<HighlightPolarity>().notNull().default("positive"),
    label: text("label").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    status: text("status").notNull().default("active"),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("offer_highlights_offer_idx").on(table.offerId),
    check("offer_highlights_locale_check", sql`${table.locale} IN ('fr', 'en')`),
    check("offer_highlights_polarity_check", sql`${table.polarity} IN ('positive', 'negative')`),
    check("offer_highlights_status_check", sql`${table.status} IN ('active', 'archived')`),
  ],
);

export const promoCodes = pgTable(
  "promo_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookmakerId: uuid("bookmaker_id")
      .notNull()
      .references(() => bookmakers.id, { onDelete: "cascade" }),
    offerId: uuid("offer_id").references(() => offers.id, { onDelete: "set null" }),
    countryId: uuid("country_id").references(() => countries.id, { onDelete: "set null" }),
    code: text("code").notNull(),
    description: text("description").notNull().default(""),
    programSource: text("program_source").notNull().default(""),
    validFrom: timestamp("valid_from", { withTimezone: true, mode: "date" }),
    validUntil: timestamp("valid_until", { withTimezone: true, mode: "date" }),
    status: text("status").$type<PromoCodeStatus>().notNull().default("active"),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("promo_codes_bm_code_uidx").on(table.bookmakerId, table.code),
    index("promo_codes_offer_idx").on(table.offerId),
    index("promo_codes_country_idx").on(table.countryId),
    check(
      "promo_codes_status_check",
      sql`${table.status} IN ('active', 'expired', 'disabled', 'archived')`,
    ),
    check(
      "promo_codes_dates_check",
      sql`${table.validUntil} IS NULL OR ${table.validFrom} IS NULL OR ${table.validUntil} > ${table.validFrom}`,
    ),
  ],
);
