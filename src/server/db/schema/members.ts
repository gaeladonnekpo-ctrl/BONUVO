import "server-only";

import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { profiles } from "./auth";

export const PREFERRED_CHANNELS = ["email", "telegram", "whatsapp", "none"] as const;
export type PreferredChannel = (typeof PREFERRED_CHANNELS)[number];

export const MEMBER_ACTIVITY_TYPES = [
  "profile_updated",
  "preferences_updated",
  "consent_recorded",
  "data_exported",
  "deletion_requested",
  "deletion_cancelled",
  "unsubscribed",
] as const;
export type MemberActivityType = (typeof MEMBER_ACTIVITY_TYPES)[number];

export const DELETION_REQUEST_STATUSES = ["pending", "cancelled", "executed"] as const;
export type DeletionRequestStatus = (typeof DELETION_REQUEST_STATUSES)[number];

export const communicationPreferences = pgTable(
  "communication_preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    emailAnnouncements: boolean("email_announcements").notNull().default(false),
    emailPromos: boolean("email_promos").notNull().default(false),
    emailPredictions: boolean("email_predictions").notNull().default(false),
    preferredChannel: text("preferred_channel")
      .$type<PreferredChannel>()
      .notNull()
      .default("email"),
    unsubscribeTokenHash: text("unsubscribe_token_hash").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("comm_prefs_user_uidx").on(table.userId),
    check(
      "comm_prefs_channel_check",
      sql`${table.preferredChannel} IN ('email', 'telegram', 'whatsapp', 'none')`,
    ),
  ],
);

export const memberActivity = pgTable(
  "member_activity",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    activityType: text("activity_type").$type<MemberActivityType>().notNull(),
    metadataJson: jsonb("metadata_json")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    ipHash: text("ip_hash").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("member_activity_user_created_idx").on(table.userId, table.createdAt),
    check(
      "member_activity_type_check",
      sql`${table.activityType} IN ('profile_updated', 'preferences_updated', 'consent_recorded', 'data_exported', 'deletion_requested', 'deletion_cancelled', 'unsubscribed')`,
    ),
  ],
);

export const accountDeletionRequests = pgTable(
  "account_deletion_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    status: text("status").$type<DeletionRequestStatus>().notNull().default("pending"),
    reason: text("reason").notNull().default(""),
    requestedAt: timestamp("requested_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    scheduledPurgeAt: timestamp("scheduled_purge_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: "date" }),
    executedAt: timestamp("executed_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("account_deletion_user_status_idx").on(table.userId, table.status),
    index("account_deletion_purge_idx").on(table.status, table.scheduledPurgeAt),
    check(
      "account_deletion_status_check",
      sql`${table.status} IN ('pending', 'cancelled', 'executed')`,
    ),
  ],
);
