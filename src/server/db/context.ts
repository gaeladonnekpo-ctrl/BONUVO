import "server-only";

import { sql } from "drizzle-orm";
import { getDb, type AppDatabase } from "./client";

export type DbExecutionScope =
  | "user_session"
  | "auth_bootstrap"
  | "audit_writer"
  | "public_catalog"
  | "public_tracking"
  | "postback_ingest"
  | "stats_aggregator"
  | "ai_pipeline"
  | "purge_worker"
  | "public_unsubscribe";

export type AppDbTransaction = Parameters<Parameters<AppDatabase["transaction"]>[0]>[0];

export interface DbExecutionContext {
  scope: DbExecutionScope;
  actorId?: string | null;
  requestId?: string | null;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertValidUuidOrEmpty(value: string | null | undefined): string {
  if (!value) return "";
  if (!UUID_REGEX.test(value)) {
    throw new Error("Identifiant utilisateur invalide pour le contexte base de données.");
  }
  return value;
}

/**
 * Executes queries inside a transaction pinned to the least-privilege `bonuvo_app`
 * role with transaction-local session context so RLS is always enforced server-side.
 * Combines `set_config` calls into a single statement to minimize network RTTs.
 */
export async function withAppDb<T>(
  context: DbExecutionContext,
  handler: (tx: AppDbTransaction) => Promise<T>,
): Promise<T> {
  const actorId = assertValidUuidOrEmpty(context.actorId);
  const requestId = context.requestId ?? "";
  const db = getDb();

  return db.transaction(async (tx) => {
    await tx.execute(sql`
      SELECT
        set_config('app.current_user_id', ${actorId}, true),
        set_config('app.db_scope', ${context.scope}, true),
        set_config('app.request_id', ${requestId}, true)
    `);
    await tx.execute(sql`SET LOCAL ROLE bonuvo_app`);
    return handler(tx);
  });
}
