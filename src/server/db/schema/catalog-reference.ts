import "server-only";

import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { profiles } from "./auth";

export const MEDIA_ASSET_STATUSES = ["active", "archived"] as const;
export type MediaAssetStatus = (typeof MEDIA_ASSET_STATUSES)[number];

export const PAYMENT_METHOD_CATEGORIES = [
  "mobile_money",
  "card",
  "bank_transfer",
  "e_wallet",
  "crypto",
  "voucher",
] as const;
export type PaymentMethodCategory = (typeof PAYMENT_METHOD_CATEGORIES)[number];

export const countries = pgTable(
  "countries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 8 }).notNull().unique(),
    nameFr: text("name_fr").notNull(),
    nameEn: text("name_en").notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).notNull().default("EUR"),
    defaultLocale: varchar("default_locale", { length: 5 }).notNull().default("fr"),
    active: boolean("active").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("countries_active_idx").on(table.active),
    check("countries_locale_check", sql`${table.defaultLocale} IN ('fr', 'en')`),
  ],
);

export const paymentMethods = pgTable(
  "payment_methods",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull().unique(),
    category: text("category").$type<PaymentMethodCategory>().notNull().default("mobile_money"),
    logoAssetId: uuid("logo_asset_id").references(() => mediaAssets.id, { onDelete: "set null" }),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("payment_methods_logo_idx").on(table.logoAssetId),
    check(
      "payment_methods_category_check",
      sql`${table.category} IN ('mobile_money', 'card', 'bank_transfer', 'e_wallet', 'crypto', 'voucher')`,
    ),
  ],
);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storageBucket: text("storage_bucket").notNull(),
    storagePath: text("storage_path").notNull().unique(),
    publicUrl: text("public_url").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    sha256: text("sha256").notNull(),
    altText: text("alt_text").notNull().default(""),
    uploadedBy: uuid("uploaded_by").references(() => profiles.id, { onDelete: "set null" }),
    status: text("status").$type<MediaAssetStatus>().notNull().default("active"),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("media_assets_uploaded_by_idx").on(table.uploadedBy),
    index("media_assets_status_idx").on(table.status),
    check(
      "media_assets_mime_check",
      sql`${table.mimeType} IN ('image/png', 'image/jpeg', 'image/webp')`,
    ),
    check("media_assets_size_check", sql`${table.sizeBytes} > 0 AND ${table.sizeBytes} <= 2097152`),
    check("media_assets_status_check", sql`${table.status} IN ('active', 'archived')`),
  ],
);

export const settings = pgTable(
  "settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: text("key").notNull().unique(),
    value: jsonb("value").$type<Record<string, unknown>>().notNull().default({}),
    description: text("description").notNull().default(""),
    updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("settings_updated_by_idx").on(table.updatedBy)],
);
