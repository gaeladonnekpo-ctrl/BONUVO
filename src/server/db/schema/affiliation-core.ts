import "server-only";

import { sql } from "drizzle-orm";
import { boolean, check, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { bookmakers } from "./bookmakers";
import { countries } from "./catalog-reference";
import { offers } from "./offers";

export const TRACKING_MODES = ["postback", "webhook", "import", "none"] as const;
export type TrackingMode = (typeof TRACKING_MODES)[number];

export const AFFILIATE_NETWORK_STATUSES = ["active", "inactive"] as const;
export type AffiliateNetworkStatus = (typeof AFFILIATE_NETWORK_STATUSES)[number];

export const AFFILIATE_LINK_STATUSES = ["active", "disabled", "archived"] as const;
export type AffiliateLinkStatus = (typeof AFFILIATE_LINK_STATUSES)[number];

export const affiliateNetworks = pgTable(
  "affiliate_networks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull().unique(),
    trackingMode: text("tracking_mode").$type<TrackingMode>().notNull().default("none"),
    subIdParamName: text("sub_id_param_name").notNull().default("subid"),
    secretEnvRef: text("secret_env_ref").notNull().default(""),
    status: text("status").$type<AffiliateNetworkStatus>().notNull().default("active"),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "affiliate_networks_mode_check",
      sql`${table.trackingMode} IN ('postback', 'webhook', 'import', 'none')`,
    ),
    check("affiliate_networks_status_check", sql`${table.status} IN ('active', 'inactive')`),
  ],
);

export const affiliateLinks = pgTable(
  "affiliate_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    bookmakerId: uuid("bookmaker_id")
      .notNull()
      .references(() => bookmakers.id, { onDelete: "cascade" }),
    countryId: uuid("country_id").references(() => countries.id, { onDelete: "set null" }),
    offerId: uuid("offer_id").references(() => offers.id, { onDelete: "set null" }),
    networkId: uuid("network_id").references(() => affiliateNetworks.id, { onDelete: "set null" }),
    destinationUrl: text("destination_url").notNull(),
    allowedHost: text("allowed_host").notNull(),
    active: boolean("active").notNull().default(true),
    status: text("status").$type<AffiliateLinkStatus>().notNull().default("active"),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("affiliate_links_bm_idx").on(table.bookmakerId),
    index("affiliate_links_country_idx").on(table.countryId),
    index("affiliate_links_offer_idx").on(table.offerId),
    index("affiliate_links_network_idx").on(table.networkId),
    index("affiliate_links_active_idx").on(table.active, table.status),
    check("affiliate_links_https_check", sql`${table.destinationUrl} LIKE 'https://%'`),
    check(
      "affiliate_links_status_check",
      sql`${table.status} IN ('active', 'disabled', 'archived')`,
    ),
  ],
);
