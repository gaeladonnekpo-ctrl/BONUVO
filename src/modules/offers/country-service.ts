import "server-only";

import { eq } from "drizzle-orm";
import { logAudit } from "@/server/audit/log";
import { requirePermission } from "@/server/auth/permissions";
import type { AuthenticatedUser } from "@/server/auth/session";
import { withAppDb } from "@/server/db/context";
import { countries } from "@/server/db/schema";
import { listCountriesRepo, listPaymentMethodsRepo } from "@/modules/offers/bookmaker-repository";
import { countryUpdateSchema } from "@/modules/offers/schema";

export async function listCountriesForAdmin(actor: AuthenticatedUser, activeOnly = false) {
  requirePermission(actor, "offers.read");
  return listCountriesRepo(actor.id, activeOnly);
}

export async function listPaymentMethodsForAdmin(actor: AuthenticatedUser) {
  requirePermission(actor, "offers.read");
  return listPaymentMethodsRepo(actor.id);
}

export async function updateCountryConfig(
  actor: AuthenticatedUser,
  rawInput: unknown,
  ipHash: string | null,
) {
  requirePermission(actor, "offers.write");
  const parsed = countryUpdateSchema.parse(rawInput);

  const result = await withAppDb({ scope: "user_session", actorId: actor.id }, async (tx) => {
    const [existing] = await tx.select().from(countries).where(eq(countries.id, parsed.id));
    if (!existing) throw new Error("COUNTRY_NOT_FOUND");
    const [updated] = await tx
      .update(countries)
      .set({
        currencyCode: parsed.currencyCode,
        defaultLocale: parsed.defaultLocale,
        active: parsed.active,
      })
      .where(eq(countries.id, parsed.id))
      .returning();
    if (!updated) throw new Error("COUNTRY_UPDATE_FAILED");
    return { beforeState: existing, afterState: updated };
  });

  await logAudit({
    actorId: actor.id,
    action: "country.updated",
    entityType: "countries",
    entityId: parsed.id,
    beforeState: result.beforeState as Record<string, unknown>,
    afterState: result.afterState as Record<string, unknown>,
    ipHash,
  });

  return result.afterState;
}
