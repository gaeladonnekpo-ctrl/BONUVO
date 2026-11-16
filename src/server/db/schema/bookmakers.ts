import "server-only";

import { sql } from "drizzle-orm";
import {
  boolean,
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
import { countries, mediaAssets, paymentMethods } from "./catalog-reference";

export const BOOKMAKER_STATUSES = ["active", "inactive", "archived"] as const;
export type BookmakerStatus = (typeof BOOKMAKER_STATUSES)[number];

export const EDITORIAL_RECORD_STATUSES = ["active", "archived"] as const;
export type EditorialRecordStatus = (typeof EDITORIAL_RECORD_STATUSES)[number];

export const bookmakers = pgTable(
  "bookmakers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    logoAssetId: uuid("logo_asset_id").references(() => mediaAssets.id, { onDelete: "set null" }),
    descriptionFr: text("description_fr").notNull().default(""),
    descriptionEn: text("description_en").notNull().default(""),
    foundedYear: integer("founded_year"),
    appPlatforms: text("app_platforms")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    allowedHosts: text("allowed_hosts")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    status: text("status").$type<BookmakerStatus>().notNull().default("active"),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("bookmakers_logo_asset_id_idx").on(table.logoAssetId),
    index("bookmakers_status_idx").on(table.status),
    check("bookmakers_status_check", sql`${table.status} IN ('active', 'inactive', 'archived')`),
    check(
      "bookmakers_founded_year_check",
      sql`${table.foundedYear} IS NULL OR (${table.foundedYear} >= 1900 AND ${table.foundedYear} <= 2100)`,
    ),
  ],
);

export const bookmakerCountries = pgTable(
  "bookmaker_countries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookmakerId: uuid("bookmaker_id")
      .notNull()
      .references(() => bookmakers.id, { onDelete: "cascade" }),
    countryId: uuid("country_id")
      .notNull()
      .references(() => countries.id, { onDelete: "cascade" }),
    eligible: boolean("eligible").notNull().default(true),
    localLicense: text("local_license").notNull().default(""),
    authorityName: text("authority_name").notNull().default(""),
    countryScore: numeric("country_score", { precision: 4, scale: 2 }),
    notes: text("notes").notNull().default(""),
    status: text("status").$type<EditorialRecordStatus>().notNull().default("active"),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("bookmaker_countries_uidx").on(table.bookmakerId, table.countryId),
    index("bookmaker_countries_bookmaker_idx").on(table.bookmakerId),
    index("bookmaker_countries_country_idx").on(table.countryId),
    check("bookmaker_countries_status_check", sql`${table.status} IN ('active', 'archived')`),
    check(
      "bookmaker_countries_score_check",
      sql`${table.countryScore} IS NULL OR (${table.countryScore} >= 0 AND ${table.countryScore} <= 10)`,
    ),
  ],
);

export const bookmakerPaymentMethods = pgTable(
  "bookmaker_payment_methods",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookmakerId: uuid("bookmaker_id")
      .notNull()
      .references(() => bookmakers.id, { onDelete: "cascade" }),
    paymentMethodId: uuid("payment_method_id")
      .notNull()
      .references(() => paymentMethods.id, { onDelete: "cascade" }),
    countryId: uuid("country_id")
      .notNull()
      .references(() => countries.id, { onDelete: "cascade" }),
    minDepositAmount: numeric("min_deposit_amount", { precision: 14, scale: 2 }),
    currencyCode: varchar("currency_code", { length: 3 }).notNull().default("XOF"),
    supportsDeposit: boolean("supports_deposit").notNull().default(true),
    supportsWithdrawal: boolean("supports_withdrawal").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("bookmaker_payment_methods_uidx").on(
      table.bookmakerId,
      table.paymentMethodId,
      table.countryId,
    ),
    index("bookmaker_payment_methods_bm_idx").on(table.bookmakerId),
    index("bookmaker_payment_methods_pm_idx").on(table.paymentMethodId),
    index("bookmaker_payment_methods_country_idx").on(table.countryId),
    check(
      "bookmaker_payment_methods_min_check",
      sql`${table.minDepositAmount} IS NULL OR ${table.minDepositAmount} >= 0`,
    ),
  ],
);

export const bookmakerRatings = pgTable(
  "bookmaker_ratings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookmakerId: uuid("bookmaker_id")
      .notNull()
      .references(() => bookmakers.id, { onDelete: "cascade" }),
    gridVersion: text("grid_version").notNull().default("v1"),
    bonusScore: numeric("bonus_score", { precision: 4, scale: 2 }).notNull(),
    paymentsScore: numeric("payments_score", { precision: 4, scale: 2 }).notNull(),
    oddsScore: numeric("odds_score", { precision: 4, scale: 2 }).notNull(),
    appScore: numeric("app_score", { precision: 4, scale: 2 }).notNull(),
    supportScore: numeric("support_score", { precision: 4, scale: 2 }).notNull(),
    finalScore: numeric("final_score", { precision: 4, scale: 2 }).notNull(),
    scoredBy: uuid("scored_by").references(() => profiles.id, { onDelete: "set null" }),
    scoredAt: timestamp("scored_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("bookmaker_ratings_bm_idx").on(table.bookmakerId),
    index("bookmaker_ratings_scored_by_idx").on(table.scoredBy),
    check(
      "bookmaker_ratings_range_check",
      sql`${table.bonusScore} >= 0 AND ${table.bonusScore} <= 10 AND ${table.paymentsScore} >= 0 AND ${table.paymentsScore} <= 10 AND ${table.oddsScore} >= 0 AND ${table.oddsScore} <= 10 AND ${table.appScore} >= 0 AND ${table.appScore} <= 10 AND ${table.supportScore} >= 0 AND ${table.supportScore} <= 10 AND ${table.finalScore} >= 0 AND ${table.finalScore} <= 10`,
    ),
  ],
);
