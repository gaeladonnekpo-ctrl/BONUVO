import "server-only";

import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { affiliateLinks } from "./affiliation-core";
import { bookmakers } from "./bookmakers";
import { countries } from "./catalog-reference";
import { offers, promoCodes } from "./offers";

export const CAMPAIGN_STATUSES = ["active", "inactive", "archived"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const VISIT_EVENT_TYPES = ["page_view", "offer_view", "promo_copy"] as const;
export type VisitEventType = (typeof VISIT_EVENT_TYPES)[number];

export const DEVICE_TYPES = ["mobile", "tablet", "desktop", "bot", "unknown"] as const;
export type DeviceType = (typeof DEVICE_TYPES)[number];

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    source: text("source").notNull().default("direct"),
    medium: text("medium").notNull().default("organic"),
    bookmakerId: uuid("bookmaker_id").references(() => bookmakers.id, { onDelete: "set null" }),
    offerId: uuid("offer_id").references(() => offers.id, { onDelete: "set null" }),
    countryId: uuid("country_id").references(() => countries.id, { onDelete: "set null" }),
    description: text("description").notNull().default(""),
    startsAt: timestamp("starts_at", { withTimezone: true, mode: "date" }),
    endsAt: timestamp("ends_at", { withTimezone: true, mode: "date" }),
    status: text("status").$type<CampaignStatus>().notNull().default("active"),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("campaigns_status_idx").on(table.status),
    index("campaigns_bm_idx").on(table.bookmakerId),
    check("campaigns_status_check", sql`${table.status} IN ('active', 'inactive', 'archived')`),
  ],
);

export const clicks = pgTable(
  "clicks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicClickId: text("public_click_id").notNull().unique(),
    affiliateLinkId: uuid("affiliate_link_id")
      .notNull()
      .references(() => affiliateLinks.id, { onDelete: "cascade" }),
    bookmakerId: uuid("bookmaker_id")
      .notNull()
      .references(() => bookmakers.id, { onDelete: "cascade" }),
    offerId: uuid("offer_id").references(() => offers.id, { onDelete: "set null" }),
    countryId: uuid("country_id").references(() => countries.id, { onDelete: "set null" }),
    campaignId: uuid("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
    campaignCode: text("campaign_code"),
    countryCode: varchar("country_code", { length: 8 }).notNull().default("GLOBAL"),
    deviceType: text("device_type").$type<DeviceType>().notNull().default("unknown"),
    referrerHost: text("referrer_host").notNull().default(""),
    ipHash: text("ip_hash").notNull(),
    anonSessionHash: text("anon_session_hash").notNull(),
    isBot: boolean("is_bot").notNull().default(false),
    isSuspect: boolean("is_suspect").notNull().default(false),
    botReason: text("bot_reason").notNull().default(""),
    userAgent: text("user_agent").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("clicks_created_at_idx").on(table.createdAt),
    index("clicks_link_created_idx").on(table.affiliateLinkId, table.createdAt),
    index("clicks_bookmaker_created_idx").on(table.bookmakerId, table.createdAt),
    index("clicks_bot_suspect_idx").on(table.isBot, table.isSuspect),
    check(
      "clicks_device_check",
      sql`${table.deviceType} IN ('mobile', 'tablet', 'desktop', 'bot', 'unknown')`,
    ),
  ],
);

export const visitEvents = pgTable(
  "visit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventType: text("event_type").$type<VisitEventType>().notNull(),
    path: text("path").notNull(),
    offerId: uuid("offer_id").references(() => offers.id, { onDelete: "set null" }),
    bookmakerId: uuid("bookmaker_id").references(() => bookmakers.id, { onDelete: "set null" }),
    promoCodeId: uuid("promo_code_id").references(() => promoCodes.id, { onDelete: "set null" }),
    countryCode: varchar("country_code", { length: 8 }).notNull().default("GLOBAL"),
    deviceType: text("device_type").$type<DeviceType>().notNull().default("unknown"),
    visitorDailyHash: text("visitor_daily_hash").notNull(),
    isBot: boolean("is_bot").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("visit_events_created_at_idx").on(table.createdAt),
    index("visit_events_type_created_idx").on(table.eventType, table.createdAt),
    index("visit_events_offer_idx").on(table.offerId),
    check(
      "visit_events_type_check",
      sql`${table.eventType} IN ('page_view', 'offer_view', 'promo_copy')`,
    ),
    check(
      "visit_events_device_check",
      sql`${table.deviceType} IN ('mobile', 'tablet', 'desktop', 'bot', 'unknown')`,
    ),
  ],
);
