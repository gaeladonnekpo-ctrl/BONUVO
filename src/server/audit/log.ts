import "server-only";

import { withAppDb } from "@/server/db/context";
import { auditLog, securityEvents, type SecuritySeverity } from "@/server/db/schema";
import { redactRecord, redactStringSecrets } from "@/server/security/redact";

export interface AuditLogInput {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  ipHash?: string | null;
  requestId?: string | null;
}

export interface SecurityEventInput {
  userId?: string | null;
  eventType: string;
  severity: SecuritySeverity;
  identifierHash?: string | null;
  ipHash?: string | null;
  route?: string | null;
  details?: Record<string, unknown>;
  requestId?: string | null;
}

export async function logAudit(input: AuditLogInput): Promise<void> {
  const beforeState = redactRecord(input.beforeState ?? null);
  const afterState = redactRecord(input.afterState ?? null);

  await withAppDb(
    {
      scope: "audit_writer",
      actorId: input.actorId ?? null,
      requestId: input.requestId ?? null,
    },
    async (tx) => {
      await tx.insert(auditLog).values({
        actorId: input.actorId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        beforeState,
        afterState,
        ipHash: input.ipHash ?? null,
        requestId: input.requestId ?? null,
      });
    },
  );
}

export async function logSecurityEvent(input: SecurityEventInput): Promise<void> {
  const safeDetails = redactRecord(input.details ?? {}) ?? {};

  try {
    await withAppDb(
      {
        scope: "audit_writer",
        actorId: input.userId ?? null,
        requestId: input.requestId ?? null,
      },
      async (tx) => {
        await tx.insert(securityEvents).values({
          userId: input.userId ?? null,
          eventType: input.eventType,
          severity: input.severity,
          identifierHash: input.identifierHash ?? null,
          ipHash: input.ipHash ?? null,
          route: input.route ?? null,
          details: safeDetails,
        });
      },
    );
  } catch (error) {
    const safeMsg =
      error instanceof Error
        ? redactStringSecrets(error.message)
        : "Erreur de journalisation sécurité.";
    console.error(`[security_events] Échec d'enregistrement (${input.eventType}): ${safeMsg}`);
  }
}
