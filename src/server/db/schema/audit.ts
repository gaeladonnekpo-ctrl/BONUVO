import "server-only";

import { sql } from "drizzle-orm";
import { check, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { profiles } from "./auth";

export const SECURITY_SEVERITIES = ["info", "warning", "high", "critical"] as const;
export type SecuritySeverity = (typeof SECURITY_SEVERITIES)[number];

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: uuid("actor_id").references(() => profiles.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    beforeState: jsonb("before_state").$type<Record<string, unknown> | null>(),
    afterState: jsonb("after_state").$type<Record<string, unknown> | null>(),
    ipHash: text("ip_hash"),
    requestId: text("request_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_log_actor_id_idx").on(table.actorId),
    index("audit_log_entity_idx").on(table.entityType, table.entityId),
    index("audit_log_created_at_idx").on(table.createdAt),
  ],
);

export const securityEvents = pgTable(
  "security_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => profiles.id, { onDelete: "set null" }),
    eventType: text("event_type").notNull(),
    severity: text("severity").$type<SecuritySeverity>().notNull(),
    identifierHash: text("identifier_hash"),
    ipHash: text("ip_hash"),
    route: text("route"),
    details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("security_events_user_id_idx").on(table.userId),
    index("security_events_type_created_idx").on(table.eventType, table.createdAt),
    index("security_events_created_at_idx").on(table.createdAt),
    check(
      "security_events_severity_check",
      sql`${table.severity} IN ('info', 'warning', 'high', 'critical')`,
    ),
  ],
);
