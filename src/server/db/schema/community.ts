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
import { profiles } from "./auth";
import { bookmakers } from "./bookmakers";

export const POST_TYPES = ["announcement", "news"] as const;
export type PostType = (typeof POST_TYPES)[number];

export const POST_STATUSES = ["draft", "published", "archived"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export const CHANNEL_PLATFORMS = [
  "telegram",
  "whatsapp_channel",
  "whatsapp_group",
  "facebook",
] as const;
export type ChannelPlatform = (typeof CHANNEL_PLATFORMS)[number];

export const COUPON_STATUSES = ["draft", "validated", "archived"] as const;
export type CouponStatus = (typeof COUPON_STATUSES)[number];
export const COUPON_SETTLEMENT_STATUSES = ["pending", "won", "lost", "void"] as const;
export type CouponSettlementStatus = (typeof COUPON_SETTLEMENT_STATUSES)[number];
export const COUPON_SOURCES = ["community", "bonuvo_ai"] as const;
export type CouponSource = (typeof COUPON_SOURCES)[number];

export interface CouponLegSnapshot {
  fixtureId: string;
  predictionId?: string;
  matchLabel: string;
  leagueName: string;
  market?: string;
  marketLabel: string;
  pickedSelection?: string;
  selectionLabel: string;
  probabilityPct: number;
  fairOdds?: number;
  kickoffAt?: string;
}

export const NOTIFICATION_CHANNELS = ["email", "telegram"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_STATUSES = ["draft", "queued", "sent", "failed"] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export const DELIVERY_STATUSES = ["sent", "skipped_no_consent", "failed"] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    postType: text("post_type").$type<PostType>().notNull().default("news"),
    titleFr: text("title_fr").notNull(),
    titleEn: text("title_en").notNull().default(""),
    excerptFr: text("excerpt_fr").notNull().default(""),
    excerptEn: text("excerpt_en").notNull().default(""),
    bodyFr: text("body_fr").notNull().default(""),
    bodyEn: text("body_en").notNull().default(""),
    countryCode: varchar("country_code", { length: 8 }).notNull().default("GLOBAL"),
    featured: boolean("featured").notNull().default(false),
    status: text("status").$type<PostStatus>().notNull().default("draft"),
    authorId: uuid("author_id").references(() => profiles.id, { onDelete: "set null" }),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("posts_slug_uidx").on(table.slug),
    index("posts_status_pub_idx").on(table.status, table.publishedAt),
    index("posts_country_status_idx").on(table.countryCode, table.status),
    check("posts_type_check", sql`${table.postType} IN ('announcement', 'news')`),
    check("posts_status_check", sql`${table.status} IN ('draft', 'published', 'archived')`),
  ],
);

export const communityChannels = pgTable(
  "community_channels",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    platform: text("platform").$type<ChannelPlatform>().notNull(),
    countryCode: varchar("country_code", { length: 8 }).notNull().default("GLOBAL"),
    titleFr: text("title_fr").notNull(),
    titleEn: text("title_en").notNull().default(""),
    descriptionFr: text("description_fr").notNull().default(""),
    descriptionEn: text("description_en").notNull().default(""),
    inviteUrl: text("invite_url").notNull(),
    subscriberCountLabel: text("subscriber_count_label").notNull().default(""),
    priorityOrder: integer("priority_order").notNull().default(100),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("community_channels_country_active_idx").on(
      table.countryCode,
      table.active,
      table.priorityOrder,
    ),
    check(
      "community_channels_platform_check",
      sql`${table.platform} IN ('telegram', 'whatsapp_channel', 'whatsapp_group', 'facebook')`,
    ),
  ],
);

export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    titleFr: text("title_fr").notNull(),
    titleEn: text("title_en").notNull().default(""),
    descriptionFr: text("description_fr").notNull().default(""),
    descriptionEn: text("description_en").notNull().default(""),
    countryCode: varchar("country_code", { length: 8 }).notNull().default("GLOBAL"),
    bookmakerId: uuid("bookmaker_id").references(() => bookmakers.id, { onDelete: "set null" }),
    couponCode: text("coupon_code").notNull().default(""),
    combinedOdds: numeric("combined_odds", { precision: 8, scale: 2 }),
    confidenceLabel: text("confidence_label").notNull().default("medium"),
    predictionIds: uuid("prediction_ids")
      .array()
      .notNull()
      .default(sql`ARRAY[]::uuid[]`),
    legsJson: jsonb("legs_json").$type<CouponLegSnapshot[]>().notNull().default([]),
    status: text("status").$type<CouponStatus>().notNull().default("draft"),
    settlementStatus: text("settlement_status")
      .$type<CouponSettlementStatus>()
      .notNull()
      .default("pending"),
    settledAt: timestamp("settled_at", { withTimezone: true, mode: "date" }),
    source: text("source").$type<CouponSource>().notNull().default("community"),
    externalKey: text("external_key"),
    validatedBy: uuid("validated_by").references(() => profiles.id, { onDelete: "set null" }),
    validatedAt: timestamp("validated_at", { withTimezone: true, mode: "date" }),
    publishedToTelegramAt: timestamp("published_to_telegram_at", {
      withTimezone: true,
      mode: "date",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("coupons_status_validated_idx").on(table.status, table.validatedAt),
    check("coupons_status_check", sql`${table.status} IN ('draft', 'validated', 'archived')`),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    titleFr: text("title_fr").notNull(),
    titleEn: text("title_en").notNull().default(""),
    bodyFr: text("body_fr").notNull(),
    bodyEn: text("body_en").notNull().default(""),
    targetCountryCode: varchar("target_country_code", { length: 8 }).notNull().default("GLOBAL"),
    channel: text("channel").$type<NotificationChannel>().notNull().default("email"),
    status: text("status").$type<NotificationStatus>().notNull().default("draft"),
    sentCount: integer("sent_count").notNull().default(0),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    sentAt: timestamp("sent_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("notifications_status_created_idx").on(table.status, table.createdAt),
    check("notifications_channel_check", sql`${table.channel} IN ('email', 'telegram')`),
    check(
      "notifications_status_check",
      sql`${table.status} IN ('draft', 'queued', 'sent', 'failed')`,
    ),
  ],
);

export const notificationDeliveries = pgTable(
  "notification_deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    notificationId: uuid("notification_id")
      .notNull()
      .references(() => notifications.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => profiles.id, { onDelete: "set null" }),
    channel: text("channel").$type<NotificationChannel>().notNull().default("email"),
    status: text("status").$type<DeliveryStatus>().notNull(),
    errorText: text("error_text").notNull().default(""),
    deliveredAt: timestamp("delivered_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("notification_deliveries_notif_idx").on(table.notificationId, table.status),
    index("notification_deliveries_user_idx").on(table.userId, table.createdAt),
    check(
      "notification_deliveries_status_check",
      sql`${table.status} IN ('sent', 'skipped_no_consent', 'failed')`,
    ),
  ],
);
