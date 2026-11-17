"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { ZodError } from "zod";
import type { AdminActionResult } from "@/lib/admin/action-result";
import { requireActionPermission } from "@/server/auth/guards";
import { ForbiddenError, UnauthorizedError } from "@/server/auth/permissions";
import type { PermissionKey } from "@/server/auth/rbac-catalog";
import type { AuthenticatedUser } from "@/server/auth/session";
import { getServerEnv } from "@/server/env";
import { extractTrustedClientIp, hashIp } from "@/server/security/ip";
import { upsertCampaign } from "./campaign-service";
import { setCommissionStatus } from "./commission-service";
import { commitConversionImport, previewConversionImport } from "./import-service";
import { replayPostbackSchema } from "./phase5-schema";
import { replayPostbackEvent } from "./postback-service";

function formatAffiliationError(error: unknown): AdminActionResult<never> {
  if (error instanceof ZodError) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: error.issues[0]?.message ?? "Données invalides.",
    };
  }
  if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
    return { ok: false, code: error.code, message: error.message };
  }
  if (error instanceof Error) {
    return { ok: false, code: "AFFILIATION_ACTION_FAILED", message: error.message };
  }
  return { ok: false, code: "UNKNOWN_ERROR", message: "Erreur inattendue." };
}

async function runAffiliationAction<T>(
  permission: PermissionKey,
  executor: (actor: AuthenticatedUser, ipHash: string | null) => Promise<T>,
  successMessage: string,
): Promise<AdminActionResult<T>> {
  try {
    const actor = await requireActionPermission(permission);
    const reqHeaders = await headers();
    const env = getServerEnv();
    const ipHash = hashIp(extractTrustedClientIp(reqHeaders, env.APP_ENV), env.IP_HASH_SECRET);
    const data = await executor(actor, ipHash);

    for (const path of [
      "/fr/admin/affiliation",
      "/en/admin/affiliation",
      "/fr/admin/campagnes",
      "/en/admin/campagnes",
      "/fr/admin/postbacks",
      "/en/admin/postbacks",
      "/fr/admin/conversions",
      "/en/admin/conversions",
      "/fr/admin/commissions",
      "/en/admin/commissions",
      "/fr/admin/imports",
      "/en/admin/imports",
    ]) {
      revalidatePath(path);
    }

    return { ok: true, message: successMessage, data };
  } catch (error) {
    return formatAffiliationError(error);
  }
}

export async function upsertCampaignAction(input: unknown) {
  return runAffiliationAction(
    "links.manage",
    (actor, ipHash) => upsertCampaign(actor, input, ipHash),
    "Campagne enregistrée.",
  );
}

export async function previewConversionImportAction(input: unknown) {
  return runAffiliationAction(
    "conversions.manage",
    (actor) => previewConversionImport(actor, input),
    "Aperçu CSV généré.",
  );
}

export async function commitConversionImportAction(input: unknown) {
  return runAffiliationAction(
    "conversions.manage",
    (actor, ipHash) => commitConversionImport(actor, input, ipHash),
    "Import des conversions validé et enregistré.",
  );
}

export async function setCommissionStatusAction(input: unknown) {
  return runAffiliationAction(
    "conversions.manage",
    (actor, ipHash) => setCommissionStatus(actor, input, ipHash),
    "Statut de commission mis à jour.",
  );
}

export async function replayPostbackEventAction(input: unknown) {
  return runAffiliationAction(
    "conversions.manage",
    (actor, ipHash) => {
      const parsed = replayPostbackSchema.parse(input);
      return replayPostbackEvent(actor, parsed.postbackEventId, ipHash);
    },
    "Événement postback rejoué.",
  );
}
