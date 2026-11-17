import "server-only";

import { eq, isNull } from "drizzle-orm";
import { logAudit } from "@/server/audit/log";
import { requirePermission } from "@/server/auth/permissions";
import type { AuthenticatedUser } from "@/server/auth/session";
import { withAppDb } from "@/server/db/context";
import { bookmakers, commissions, conversionImports, conversions } from "@/server/db/schema";
import { resolveConversionAttributionTx } from "./attribution-helper";
import { normalizeCsvConversionType, parseCsvRecords } from "./csv-parser";
import { csvConversionRowSchema, csvImportActionSchema } from "./phase5-schema";

export interface ParsedCsvImportRow {
  readonly rowNumber: number;
  readonly externalEventId: string;
  readonly bookmakerSlug: string;
  readonly conversionType: "registration" | "first_deposit" | "qualified";
  readonly occurredAt: Date;
  readonly amount: number | null;
  readonly currencyCode: string;
  readonly publicClickId: string | null;
  readonly promoCode: string | null;
  readonly playerId: string;
  readonly commissionModel: "cpa" | "revshare" | "hybrid";
  readonly commissionAmount: number | null;
  readonly periodLabel: string;
  readonly proofReference: string;
}

export interface CsvImportPreviewResult {
  readonly totalRows: number;
  readonly acceptedRows: ParsedCsvImportRow[];
  readonly rejections: Array<{ row: number; reason: string }>;
  readonly duplicateCount: number;
}

async function analyzeCsvForActor(
  actorId: string,
  rawInput: unknown,
): Promise<{
  parsedInput: ReturnType<typeof csvImportActionSchema.parse>;
  preview: CsvImportPreviewResult;
  bookmakerBySlug: Map<string, string>;
}> {
  const parsedInput = csvImportActionSchema.parse(rawInput);
  const { rows } = parseCsvRecords(parsedInput.csvText);

  const { bmRows, existingIds } = await withAppDb(
    { scope: "user_session", actorId },
    async (tx) => {
      const bms = await tx
        .select({ id: bookmakers.id, slug: bookmakers.slug })
        .from(bookmakers)
        .where(isNull(bookmakers.deletedAt));

      const existing = parsedInput.networkId
        ? await tx
            .select({ externalEventId: conversions.externalEventId })
            .from(conversions)
            .where(eq(conversions.networkId, parsedInput.networkId))
        : [];

      return {
        bmRows: bms,
        existingIds: new Set(existing.map((e) => e.externalEventId).filter(Boolean)),
      };
    },
  );

  const bookmakerBySlug = new Map(bmRows.map((b) => [b.slug.toLowerCase(), b.id]));
  const seenInCsv = new Set<string>();
  const acceptedRows: ParsedCsvImportRow[] = [];
  const rejections: Array<{ row: number; reason: string }> = [];
  let duplicateCount = 0;

  for (const item of rows) {
    const v = item.values;
    const rawAmount = (v.amount ?? "").trim();
    const rawComm = (v.commission_amount ?? "").trim();
    const parsedAmount = rawAmount === "" ? null : Number(rawAmount);
    const parsedComm = rawComm === "" ? null : Number(rawComm);

    if (parsedAmount !== null && (!Number.isFinite(parsedAmount) || parsedAmount < 0)) {
      rejections.push({ row: item.rowNumber, reason: "Montant invalide ou négatif" });
      continue;
    }
    if (parsedComm !== null && (!Number.isFinite(parsedComm) || parsedComm < 0)) {
      rejections.push({ row: item.rowNumber, reason: "Commission invalide ou négative" });
      continue;
    }

    const occurredDate = new Date((v.occurred_at ?? "").trim());
    if (Number.isNaN(occurredDate.getTime())) {
      rejections.push({ row: item.rowNumber, reason: "Date occurred_at invalide" });
      continue;
    }

    const validated = csvConversionRowSchema.safeParse({
      external_event_id: v.external_event_id ?? "",
      bookmaker_slug: v.bookmaker_slug ?? "",
      conversion_type: normalizeCsvConversionType(v.conversion_type),
      occurred_at: occurredDate,
      amount: parsedAmount,
      currency: v.currency ?? "",
      click_id: v.click_id ?? "",
      promo_code: v.promo_code ?? "",
      player_id: v.player_id ?? "",
      commission_model: (v.commission_model || "cpa").toLowerCase(),
      commission_amount: parsedComm,
      period_label: v.period_label ?? "",
      proof_reference: v.proof_reference ?? "",
    });

    if (!validated.success) {
      rejections.push({
        row: item.rowNumber,
        reason: validated.error.issues[0]?.message ?? "Ligne invalide",
      });
      continue;
    }

    const d = validated.data;
    if (!bookmakerBySlug.has(d.bookmaker_slug)) {
      rejections.push({ row: item.rowNumber, reason: `Bookmaker inconnu (${d.bookmaker_slug})` });
      continue;
    }

    if ((d.amount !== null || d.commission_amount !== null) && !d.currency) {
      rejections.push({ row: item.rowNumber, reason: "Devise obligatoire pour un montant" });
      continue;
    }

    if (seenInCsv.has(d.external_event_id) || existingIds.has(d.external_event_id)) {
      duplicateCount++;
      rejections.push({
        row: item.rowNumber,
        reason: `Doublon external_event_id (${d.external_event_id})`,
      });
      continue;
    }
    seenInCsv.add(d.external_event_id);

    acceptedRows.push({
      rowNumber: item.rowNumber,
      externalEventId: d.external_event_id,
      bookmakerSlug: d.bookmaker_slug,
      conversionType: d.conversion_type,
      occurredAt: d.occurred_at,
      amount: d.amount,
      currencyCode: d.currency,
      publicClickId: d.click_id || null,
      promoCode: d.promo_code || null,
      playerId: d.player_id,
      commissionModel: d.commission_model,
      commissionAmount: d.commission_amount,
      periodLabel: d.period_label || d.occurred_at.toISOString().slice(0, 7),
      proofReference: d.proof_reference,
    });
  }

  return {
    parsedInput,
    bookmakerBySlug,
    preview: { totalRows: rows.length, acceptedRows, rejections, duplicateCount },
  };
}

export async function previewConversionImport(actor: AuthenticatedUser, rawInput: unknown) {
  requirePermission(actor, "conversions.manage");
  const { preview } = await analyzeCsvForActor(actor.id, rawInput);
  return {
    totalRows: preview.totalRows,
    acceptedCount: preview.acceptedRows.length,
    rejectedCount: preview.rejections.length,
    duplicateCount: preview.duplicateCount,
    sampleAccepted: preview.acceptedRows.slice(0, 10),
    rejections: preview.rejections.slice(0, 100),
  };
}

export async function commitConversionImport(
  actor: AuthenticatedUser,
  rawInput: unknown,
  ipHash: string | null,
) {
  requirePermission(actor, "conversions.manage");
  const { parsedInput, preview, bookmakerBySlug } = await analyzeCsvForActor(actor.id, rawInput);

  const importRecord = await withAppDb({ scope: "user_session", actorId: actor.id }, async (tx) => {
    const [imp] = await tx
      .insert(conversionImports)
      .values({
        networkId: parsedInput.networkId,
        filename: parsedInput.filename,
        periodStart: parsedInput.periodStart ? new Date(parsedInput.periodStart) : null,
        periodEnd: parsedInput.periodEnd ? new Date(parsedInput.periodEnd) : null,
        importedBy: actor.id,
        totalRows: preview.totalRows,
        acceptedRows: preview.acceptedRows.length,
        rejectedRows: preview.rejections.length,
        rejectionReport: preview.rejections.slice(0, 200),
        status: "committed",
      })
      .returning();

    if (!imp) throw new Error("IMPORT_CREATE_FAILED");

    for (const row of preview.acceptedRows) {
      const bmId = bookmakerBySlug.get(row.bookmakerSlug)!;
      const attribution = await resolveConversionAttributionTx(tx, {
        publicClickId: row.publicClickId,
        promoCode: row.promoCode,
        fallbackBookmakerId: bmId,
      });

      const resolvedBmId = attribution?.bookmakerId ?? bmId;
      const [conv] = await tx
        .insert(conversions)
        .values({
          networkId: parsedInput.networkId,
          bookmakerId: resolvedBmId,
          offerId: attribution?.offerId ?? null,
          countryId: attribution?.countryId ?? null,
          clickId: attribution?.clickId ?? null,
          promoCodeId: attribution?.promoCodeId ?? null,
          importId: imp.id,
          externalEventId: row.externalEventId,
          externalPlayerId: row.playerId,
          conversionType: row.conversionType,
          attributionMode: attribution?.attributionMode ?? "unattributed",
          source: "import",
          status: attribution?.status ?? "unattributed",
          amount: row.amount !== null ? row.amount.toFixed(2) : null,
          currencyCode: row.currencyCode || null,
          occurredAt: row.occurredAt,
        })
        .returning({ id: conversions.id });

      if (conv && row.commissionAmount !== null && row.currencyCode) {
        await tx.insert(commissions).values({
          conversionId: conv.id,
          importId: imp.id,
          bookmakerId: resolvedBmId,
          model: row.commissionModel,
          amount: row.commissionAmount.toFixed(2),
          currencyCode: row.currencyCode,
          status: "pending",
          periodLabel: row.periodLabel,
          proofReference: row.proofReference,
          updatedBy: actor.id,
        });
      }
    }

    return imp;
  });

  await logAudit({
    actorId: actor.id,
    action: "conversion_import.committed",
    entityType: "conversion_imports",
    entityId: importRecord.id,
    beforeState: null,
    afterState: {
      filename: importRecord.filename,
      totalRows: importRecord.totalRows,
      acceptedRows: importRecord.acceptedRows,
      rejectedRows: importRecord.rejectedRows,
    },
    ipHash,
  });

  return importRecord;
}
