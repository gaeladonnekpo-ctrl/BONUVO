import "server-only";

import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { bookmakers } from "./bookmakers";
import { offers } from "./offers";
import { campaigns } from "./public-events";

export const METRIC_GRAINS = ["day_total", "day_country", "breakdown"] as const;
export type MetricGrain = (typeof METRIC_GRAINS)[number];

export const dailyMetrics = pgTable(
  "daily_metrics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    dimensionKey: text("dimension_key").notNull().unique(),
    grain: text("grain").$type<MetricGrain>().notNull(),
    metricDate: date("metric_date", { mode: "string" }).notNull(),
    countryCode: varchar("country_code", { length: 8 }).notNull().default("GLOBAL"),
    bookmakerId: uuid("bookmaker_id").references(() => bookmakers.id, { onDelete: "cascade" }),
    offerId: uuid("offer_id").references(() => offers.id, { onDelete: "set null" }),
    campaignId: uuid("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
    uniqueVisitors: integer("unique_visitors").notNull().default(0),
    pageViews: integer("page_views").notNull().default(0),
    offerViews: integer("offer_views").notNull().default(0),
    promoCopies: integer("promo_copies").notNull().default(0),
    rawClicks: integer("raw_clicks").notNull().default(0),
    validClicks: integer("valid_clicks").notNull().default(0),
    registrations: integer("registrations").notNull().default(0),
    firstDeposits: integer("first_deposits").notNull().default(0),
    qualifiedConversions: integer("qualified_conversions").notNull().default(0),
    confirmedCommissionsCount: integer("confirmed_commissions_count").notNull().default(0),
    confirmedCommissionsEur: numeric("confirmed_commissions_eur", { precision: 14, scale: 2 })
      .notNull()
      .default("0.00"),
    pendingCommissionsEur: numeric("pending_commissions_eur", { precision: 14, scale: 2 })
      .notNull()
      .default("0.00"),
    aggregatedAt: timestamp("aggregated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("daily_metrics_grain_date_idx").on(table.grain, table.metricDate),
    index("daily_metrics_country_date_idx").on(table.grain, table.countryCode, table.metricDate),
    index("daily_metrics_bm_date_idx").on(table.grain, table.bookmakerId, table.metricDate),
    index("daily_metrics_campaign_date_idx").on(table.grain, table.campaignId, table.metricDate),
    check(
      "daily_metrics_grain_check",
      sql`${table.grain} IN ('day_total', 'day_country', 'breakdown')`,
    ),
    check(
      "daily_metrics_nonneg_check",
      sql`${table.uniqueVisitors} >= 0 AND ${table.pageViews} >= 0 AND ${table.offerViews} >= 0 AND ${table.promoCopies} >= 0 AND ${table.rawClicks} >= 0 AND ${table.validClicks} >= 0 AND ${table.registrations} >= 0 AND ${table.firstDeposits} >= 0 AND ${table.qualifiedConversions} >= 0 AND ${table.confirmedCommissionsCount} >= 0 AND ${table.confirmedCommissionsEur} >= 0 AND ${table.pendingCommissionsEur} >= 0`,
    ),
  ],
);
