"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { ZodError } from "zod";
import type { AdminActionResult } from "@/lib/admin/action-result";
import { invalidatePublicCatalogTags } from "@/server/cache/catalog-tags";
import { requireActionPermission } from "@/server/auth/guards";
import { ForbiddenError, UnauthorizedError } from "@/server/auth/permissions";
import type { PermissionKey } from "@/server/auth/rbac-catalog";
import type { AuthenticatedUser } from "@/server/auth/session";
import { getServerEnv } from "@/server/env";
import { extractTrustedClientIp, hashIp } from "@/server/security/ip";
import { upsertAffiliateLink, upsertAffiliateNetwork } from "@/modules/offers/affiliation-service";
import {
  addBookmakerRating,
  archiveBookmaker,
  saveBookmaker,
  updateCountryConfig,
  upsertBookmakerCountry,
  upsertBookmakerPaymentMethod,
} from "@/modules/offers/bookmaker-service";
import {
  addOfferHighlight,
  addOfferTerm,
  deleteOfferHard,
  markOfferVerified,
  saveOffer,
  transitionOfferStatus,
  upsertPromoCode,
} from "@/modules/offers/offer-service";

function formatActionError(error: unknown): AdminActionResult<never> {
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
    if (error.message.startsWith("AFFILIATE_URL_REJECTED:")) {
      const reason = error.message.split(":")[1];
      return {
        ok: false,
        code: "AFFILIATE_URL_REJECTED",
        message:
          reason === "HTTPS_REQUIRED"
            ? "L'URL d'affiliation doit utiliser HTTPS."
            : reason === "HOST_NOT_ALLOWED"
              ? "L'hôte de l'URL ne figure pas dans allowed_hosts du bookmaker."
              : "URL d'affiliation rejetée par le contrôle B1.",
      };
    }
    if (error.message === "CONFIRMATION_MISMATCH") {
      return {
        ok: false,
        code: "CONFIRMATION_MISMATCH",
        message: "Le nom de confirmation ne correspond pas exactement à l'élément.",
      };
    }
    return { ok: false, code: "ACTION_FAILED", message: "L'opération a échoué." };
  }
  return { ok: false, code: "UNKNOWN_ERROR", message: "Erreur inattendue." };
}

async function runCatalogAction<T>(
  permission: PermissionKey,
  paths: string[],
  tags: string[],
  executor: (actor: AuthenticatedUser, ipHash: string | null) => Promise<T>,
  successMessage: string,
): Promise<AdminActionResult<T>> {
  try {
    const actor = await requireActionPermission(permission);
    const reqHeaders = await headers();
    const env = getServerEnv();
    const ipHash = hashIp(extractTrustedClientIp(reqHeaders, env.APP_ENV), env.IP_HASH_SECRET);
    const data = await executor(actor, ipHash);

    invalidatePublicCatalogTags([...tags, "offers", "bookmakers", "promo-codes", "countries"]);
    const publicPaths = [
      "/fr",
      "/en",
      "/fr/offres",
      "/en/offres",
      "/fr/bookmakers",
      "/en/bookmakers",
      "/fr/codes-promo",
      "/en/codes-promo",
      "/fr/comparateur",
      "/en/comparateur",
    ];
    for (const p of [...paths, ...publicPaths]) revalidatePath(p);
    return { ok: true, message: successMessage, data };
  } catch (error) {
    return formatActionError(error);
  }
}

export async function saveBookmakerAction(input: unknown) {
  return runCatalogAction(
    "offers.write",
    ["/fr/admin", "/fr/admin/bookmakers", "/fr/admin/catalogue", "/en/admin/bookmakers"],
    ["offers"],
    (actor, ipHash) => saveBookmaker(actor, input, ipHash),
    "Bookmaker enregistré.",
  );
}

export async function archiveBookmakerAction(bookmakerId: string) {
  return runCatalogAction(
    "offers.write",
    ["/fr/admin/bookmakers", "/en/admin/bookmakers"],
    ["offers", `bookmaker:${bookmakerId}`],
    (actor, ipHash) => archiveBookmaker(actor, bookmakerId, ipHash),
    "Bookmaker archivé.",
  );
}

export async function upsertBookmakerCountryAction(input: unknown) {
  return runCatalogAction(
    "offers.write",
    ["/fr/admin/bookmakers", "/en/admin/bookmakers"],
    ["offers"],
    (actor, ipHash) => upsertBookmakerCountry(actor, input, ipHash),
    "Éligibilité pays enregistrée.",
  );
}

export async function upsertBookmakerPaymentMethodAction(input: unknown) {
  return runCatalogAction(
    "offers.write",
    ["/fr/admin/bookmakers", "/en/admin/bookmakers"],
    ["offers"],
    (actor, ipHash) => upsertBookmakerPaymentMethod(actor, input, ipHash),
    "Moyen de paiement enregistré.",
  );
}

export async function addBookmakerRatingAction(input: unknown) {
  return runCatalogAction(
    "offers.write",
    ["/fr/admin/bookmakers", "/en/admin/bookmakers"],
    ["offers"],
    (actor, ipHash) => addBookmakerRating(actor, input, ipHash),
    "Grille de notation enregistrée.",
  );
}

export async function saveOfferAction(input: unknown) {
  return runCatalogAction(
    "offers.write",
    ["/fr/admin", "/fr/admin/offres", "/fr/admin/catalogue", "/en/admin/offres"],
    ["offers"],
    (actor, ipHash) => saveOffer(actor, input, ipHash),
    "Offre enregistrée.",
  );
}

export async function transitionOfferStatusAction(offerId: string, nextStatus: string) {
  const perm: PermissionKey = nextStatus === "published" ? "offers.publish" : "offers.write";
  return runCatalogAction(
    perm,
    ["/fr/admin", "/fr/admin/offres", `/fr/admin/offres/${offerId}`, "/en/admin/offres"],
    ["offers"],
    (actor, ipHash) => transitionOfferStatus(actor, { offerId, nextStatus }, ipHash),
    "Statut de l'offre mis à jour.",
  );
}

export async function markOfferVerifiedAction(offerId: string) {
  return runCatalogAction(
    "offers.write",
    ["/fr/admin", "/fr/admin/offres", `/fr/admin/offres/${offerId}`],
    ["offers"],
    (actor, ipHash) => markOfferVerified(actor, offerId, ipHash),
    "Offre marquée comme vérifiée aujourd'hui.",
  );
}

export async function deleteOfferAction(entityId: string, confirmationName: string) {
  return runCatalogAction(
    "offers.publish",
    ["/fr/admin", "/fr/admin/offres", "/fr/admin/catalogue"],
    ["offers"],
    (actor, ipHash) => deleteOfferHard(actor, { entityId, confirmationName }, ipHash),
    "Offre supprimée définitivement.",
  );
}

export async function addOfferTermAction(input: unknown) {
  return runCatalogAction(
    "offers.write",
    ["/fr/admin/offres", "/en/admin/offres"],
    ["offers"],
    (actor, ipHash) => addOfferTerm(actor, input, ipHash),
    "Condition ajoutée.",
  );
}

export async function addOfferHighlightAction(input: unknown) {
  return runCatalogAction(
    "offers.write",
    ["/fr/admin/offres", "/en/admin/offres"],
    ["offers"],
    (actor, ipHash) => addOfferHighlight(actor, input, ipHash),
    "Argument ajouté.",
  );
}

export async function upsertPromoCodeAction(input: unknown) {
  return runCatalogAction(
    "offers.write",
    ["/fr/admin", "/fr/admin/codes-promo", "/fr/admin/offres", "/en/admin/codes-promo"],
    ["offers"],
    (actor, ipHash) => upsertPromoCode(actor, input, ipHash),
    "Code promo enregistré.",
  );
}

export async function upsertAffiliateNetworkAction(input: unknown) {
  return runCatalogAction(
    "links.manage",
    ["/fr/admin/affiliation", "/en/admin/affiliation"],
    ["offers"],
    (actor, ipHash) => upsertAffiliateNetwork(actor, input, ipHash),
    "Réseau d'affiliation enregistré.",
  );
}

export async function upsertAffiliateLinkAction(input: unknown) {
  return runCatalogAction(
    "links.manage",
    ["/fr/admin", "/fr/admin/affiliation", "/en/admin/affiliation"],
    ["offers"],
    (actor, ipHash) => upsertAffiliateLink(actor, input, ipHash),
    "Lien d'affiliation enregistré.",
  );
}

export async function updateCountryConfigAction(input: unknown) {
  return runCatalogAction(
    "offers.write",
    ["/fr/admin/pays", "/en/admin/pays"],
    ["offers"],
    (actor, ipHash) => updateCountryConfig(actor, input, ipHash),
    "Configuration pays mise à jour.",
  );
}
