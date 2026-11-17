import "server-only";

import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { affiliateNetworks } from "./affiliation-core";
import { profiles } from "./auth";
import { bookmakers } from "./bookmakers";
import { countries } from "./catalog-reference";
import { offers, promoCodes } from "./offers";
import { clicks } from "./public-events";

export const POSTBACK_SOURCE_TYPES = ["postback", "webhook"] as const;
export type PostbackSourceType = (typeof POSTBACK_SOURCE_TYPES)[number];

export const POSTBACK_PROCESSING_STATUSES = [
  "received",
  "processed",
  "duplicate",
  "rejected",
  "replay",
] as const;
export type PostbackProcessingStatus = (typeof POSTBACK_PROCESSING_STATUSES)[number];

export const CONVERSION_TYPES = ["registration", "first_deposit", "qualified"] as const;
export type ConversionType = (typeof CONVERSION_TYPES)[number];

export const CONVERSION_SOURCES = ["postback", "webhook", "import"] as const;
export type ConversionSource = (typeof CONVERSION_SOURCES)[number];

export const ATTRIBUTION_MODES = ["click_id", "promo_code", "unattributed"] as const;
export type AttributionMode = (typeof ATTRIBUTION_MODES)[number];

export const CONVERSION_STATUSES = ["recorded", "unattributed", "rejected"] as const;
export type ConversionStatus = (typeof CONVERSION_STATUSES)[number];

export const COMMISSION_MODELS = ["cpa", "revshare", "hybrid"] as const;
export type CommissionModel = (typeof COMMISSION_MODELS)[number];

export const COMMISSION_STATUSES = ["pending", "confirmed", "rejected", "paid"] as const;
export type CommissionStatus = (typeof COMMISSION_STATUSES)[number];

export const IMPORT_STATUSES = ["preview", "committed", "failed"] as const;
export type ImportStatus = (typeof IMPORT_STATUSES)[number];

export const postbackEvents = pgTable(
  "postback_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    networkId: uuid("network_id").references(() => affiliateNetworks.id, { onDelete: "set null" }),
    networkSlug: text("network_slug").notNull(),
    sourceType: text("source_type").$type<PostbackSourceType>().notNull().default("postback"),
    externalEventId: text("external_event_id").notNull().default(""),
    rawQuery: jsonb("raw_query")
      .$type<Record<string, string>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    rawHeaders: jsonb("raw_headers")
      .$type<Record<string, string>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    rawBody: text("raw_body").notNull().default(""),
    signatureValid: boolean("signature_valid").notNull().default(false),
    processingStatus: text("processing_status")
      .$type<PostbackProcessingStatus>()
      .notNull()
      .default("received"),
    rejectionReason: text("rejection_reason").notNull().default(""),
    clickId: uuid("click_id").references(() => clicks.id, { onDelete: "set null" }),
    ipHash: text("ip_hash").notNull().default(""),
    eventTimestamp: timestamp("event_timestamp", { withTimezone: true, mode: "date" }),
    processedAt: timestamp("processed_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("postback_events_created_idx").on(table.createdAt),
    index("postback_events_network_idx").on(table.networkId, table.createdAt),
    index("postback_events_status_idx").on(table.processingStatus, table.createdAt),
    check("postback_events_source_check", sql`${table.sourceType} IN ('postback', 'webhook')`),
    check(
      "postback_events_status_check",
      sql`${table.processingStatus} IN ('received', 'processed', 'duplicate', 'rejected', 'replay')`,
    ),
  ],
);

export const conversionImports = pgTable(
  "conversion_imports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    networkId: uuid("network_id").references(() => affiliateNetworks.id, { onDelete: "set null" }),
    bookmakerId: uuid("bookmaker_id").references(() => bookmakers.id, { onDelete: "set null" }),
    filename: text("filename").notNull(),
    periodStart: timestamp("period_start", { withTimezone: true, mode: "date" }),
    periodEnd: timestamp("period_end", { withTimezone: true, mode: "date" }),
    importedBy: uuid("imported_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    totalRows: integer("total_rows").notNull().default(0),
    acceptedRows: integer("accepted_rows").notNull().default(0),
    rejectedRows: integer("rejected_rows").notNull().default(0),
    rejectionReport: jsonb("rejection_report")
      .$type<Array<{ row: number; reason: string }>>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    status: text("status").$type<ImportStatus>().notNull().default("committed"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("conversion_imports_created_idx").on(table.createdAt),
    check(
      "conversion_imports_status_check",
      sql`${table.status} IN ('preview', 'committed', 'failed')`,
    ),
    check(
      "conversion_imports_counts_check",
      sql`${table.totalRows} >= 0 AND ${table.acceptedRows} >= 0 AND ${table.rejectedRows} >= 0`,
    ),
  ],
);

export const conversions = pgTable(
  "conversions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    networkId: uuid("network_id").references(() => affiliateNetworks.id, { onDelete: "set null" }),
    bookmakerId: uuid("bookmaker_id")
      .notNull()
      .references(() => bookmakers.id, { onDelete: "cascade" }),
    offerId: uuid("offer_id").references(() => offers.id, { onDelete: "set null" }),
    countryId: uuid("country_id").references(() => countries.id, { onDelete: "set null" }),
    clickId: uuid("click_id").references(() => clicks.id, { onDelete: "set null" }),
    promoCodeId: uuid("promo_code_id").references(() => promoCodes.id, { onDelete: "set null" }),
    postbackEventId: uuid("postback_event_id").references(() => postbackEvents.id, {
      onDelete: "set null",
    }),
    importId: uuid("import_id").references(() => conversionImports.id, { onDelete: "set null" }),
    externalEventId: text("external_event_id").notNull().default(""),
    externalPlayerId: text("external_player_id").notNull().default(""),
    conversionType: text("conversion_type").$type<ConversionType>().notNull(),
    attributionMode: text("attribution_mode").$type<AttributionMode>().notNull(),
    source: text("source").$type<ConversionSource>().notNull(),
    status: text("status").$type<ConversionStatus>().notNull().default("recorded"),
    amount: numeric("amount", { precision: 14, scale: 2 }),
    currencyCode: varchar("currency_code", { length: 3 }),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("conversions_network_external_uidx")
      .on(table.networkId, table.externalEventId)
      .where(sql`${table.networkId} IS NOT NULL AND ${table.externalEventId} <> ''`),
    uniqueIndex("conversions_postback_uidx")
      .on(table.postbackEventId)
      .where(sql`${table.postbackEventId} IS NOT NULL`),
    index("conversions_occurred_idx").on(table.occurredAt),
    index("conversions_bm_type_idx").on(table.bookmakerId, table.conversionType, table.occurredAt),
    index("conversions_country_occurred_idx").on(table.countryId, table.occurredAt),
    index("conversions_offer_occurred_idx").on(table.offerId, table.occurredAt),
    index("conversions_click_idx").on(table.clickId),
    check(
      "conversions_source_ref_check",
      sql`${table.postbackEventId} IS NOT NULL OR ${table.importId} IS NOT NULL`,
    ),
    check(
      "conversions_type_check",
      sql`${table.conversionType} IN ('registration', 'first_deposit', 'qualified')`,
    ),
    check(
      "conversions_attribution_check",
      sql`${table.attributionMode} IN ('click_id', 'promo_code', 'unattributed')`,
    ),
    check("conversions_source_check", sql`${table.source} IN ('postback', 'webhook', 'import')`),
    check(
      "conversions_status_check",
      sql`${table.status} IN ('recorded', 'unattributed', 'rejected')`,
    ),
    check("conversions_amount_check", sql`${table.amount} IS NULL OR ${table.amount} >= 0`),
  ],
);

export const commissions = pgTable(
  "commissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversionId: uuid("conversion_id").references(() => conversions.id, { onDelete: "cascade" }),
    importId: uuid("import_id").references(() => conversionImports.id, { onDelete: "set null" }),
    bookmakerId: uuid("bookmaker_id")
      .notNull()
      .references(() => bookmakers.id, { onDelete: "cascade" }),
    model: text("model").$type<CommissionModel>().notNull().default("cpa"),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    status: text("status").$type<CommissionStatus>().notNull().default("pending"),
    periodLabel: text("period_label").notNull().default(""),
    proofReference: text("proof_reference").notNull().default(""),
    notes: text("notes").notNull().default(""),
    updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("commissions_status_idx").on(table.status, table.createdAt),
    index("commissions_bm_period_idx").on(table.bookmakerId, table.periodLabel),
    check(
      "commissions_source_ref_check",
      sql`${table.conversionId} IS NOT NULL OR ${table.importId} IS NOT NULL`,
    ),
    check("commissions_model_check", sql`${table.model} IN ('cpa', 'revshare', 'hybrid')`),
    check(
      "commissions_status_check",
      sql`${table.status} IN ('pending', 'confirmed', 'rejected', 'paid')`,
    ),
    check("commissions_amount_check", sql`${table.amount} >= 0`),
  ],
);

export const commissionHistory = pgTable(
  "commission_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    commissionId: uuid("commission_id")
      .notNull()
      .references(() => commissions.id, { onDelete: "cascade" }),
    previousStatus: text("previous_status").$type<CommissionStatus>(),
    nextStatus: text("next_status").$type<CommissionStatus>().notNull(),
    reason: text("reason").notNull().default(""),
    proofReference: text("proof_reference").notNull().default(""),
    changedBy: uuid("changed_by").references(() => profiles.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("commission_history_comm_idx").on(table.commissionId, table.createdAt),
    check(
      "commission_history_next_check",
      sql`${table.nextStatus} IN ('pending', 'confirmed', 'rejected', 'paid')`,
    ),
  ],
);
