import { z } from "zod";

export const ALLOWED_AFFILIATE_CURRENCIES = new Set([
  "XOF",
  "XAF",
  "USD",
  "EUR",
  "GBP",
  "MAD",
  "NGN",
  "GHS",
  "KES",
  "GNF",
  "CDF",
]);

export const campaignUpsertSchema = z
  .object({
    id: z.string().uuid().optional(),
    code: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9_-]{2,64}$/, "Code campagne invalide (a-z, 0-9, _ ou -).")
      .max(64),
    name: z.string().trim().min(2).max(120),
    source: z.string().trim().min(1).max(60).default("direct"),
    medium: z.string().trim().min(1).max(60).default("organic"),
    bookmakerId: z.string().uuid().nullable().optional().default(null),
    offerId: z.string().uuid().nullable().optional().default(null),
    countryId: z.string().uuid().nullable().optional().default(null),
    description: z.string().trim().max(500).default(""),
    startsAt: z
      .string()
      .trim()
      .optional()
      .transform((val) => (val ? new Date(val) : null)),
    endsAt: z
      .string()
      .trim()
      .optional()
      .transform((val) => (val ? new Date(val) : null)),
    status: z.enum(["active", "inactive", "archived"]).default("active"),
  })
  .refine((data) => !data.startsAt || !data.endsAt || data.endsAt > data.startsAt, {
    path: ["endsAt"],
    message: "La date de fin doit être postérieure à la date de début.",
  });

export const commissionStatusUpdateSchema = z
  .object({
    commissionId: z.string().uuid(),
    nextStatus: z.enum(["pending", "confirmed", "rejected", "paid"]),
    proofReference: z.string().trim().max(200).default(""),
    reason: z.string().trim().max(500).default(""),
  })
  .refine((data) => data.nextStatus !== "confirmed" || data.proofReference.trim().length >= 3, {
    path: ["proofReference"],
    message: "Une référence justificative partenaire (min. 3 car.) est requise pour confirmer.",
  });

export const csvConversionRowSchema = z.object({
  external_event_id: z.string().trim().min(1, "external_event_id manquant").max(120),
  bookmaker_slug: z.string().trim().toLowerCase().min(1, "bookmaker_slug manquant").max(80),
  conversion_type: z.enum(["registration", "first_deposit", "qualified"]),
  occurred_at: z.date(),
  amount: z.number().nonnegative().nullable(),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .refine((c) => c === "" || ALLOWED_AFFILIATE_CURRENCIES.has(c), "Devise inconnue"),
  click_id: z.string().trim().max(120).default(""),
  promo_code: z.string().trim().toUpperCase().max(48).default(""),
  player_id: z.string().trim().max(120).default(""),
  commission_model: z.enum(["cpa", "revshare", "hybrid"]).default("cpa"),
  commission_amount: z.number().nonnegative().nullable(),
  period_label: z.string().trim().max(32).default(""),
  proof_reference: z.string().trim().max(200).default(""),
});

export const csvImportActionSchema = z.object({
  filename: z.string().trim().min(1).max(200),
  networkId: z.string().uuid().nullable().optional().default(null),
  periodStart: z.string().trim().optional().default(""),
  periodEnd: z.string().trim().optional().default(""),
  csvText: z.string().min(1, "Le contenu CSV est vide.").max(2_000_000, "Fichier CSV > 2 Mo."),
});

export const replayPostbackSchema = z.object({
  postbackEventId: z.string().uuid(),
});
