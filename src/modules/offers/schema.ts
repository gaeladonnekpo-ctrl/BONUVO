import { z } from "zod";
import { normalizeAllowedHostsList } from "@/modules/offers/url-guard";

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const CURRENCY_REGEX = /^[A-Z]{3}$/;

const optionalNumberString = (minVal: number, maxVal = 1_000_000_000) =>
  z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((val) => {
      if (val === null || val === undefined || String(val).trim() === "") return null;
      return String(val).trim().replace(",", ".");
    })
    .refine(
      (val) => {
        if (val === null) return true;
        if (!/^\d+(?:\.\d{1,2})?$/.test(val)) return false;
        const parsed = Number(val);
        return parsed >= minVal && parsed <= maxVal;
      },
      { message: `Valeur numérique attendue entre ${minVal} et ${maxVal}.` },
    );

const optionalDateSchema = z
  .union([z.string(), z.date(), z.null(), z.undefined()])
  .transform((val) => {
    if (!val || String(val).trim() === "") return null;
    const date = val instanceof Date ? val : new Date(val);
    return Number.isNaN(date.getTime()) ? "INVALID" : date;
  })
  .refine((val) => val !== "INVALID", { message: "Date invalide." })
  .transform((val) => (val === "INVALID" ? null : val));

export const bookmakerInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Nom requis (2 caractères min).").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(SLUG_REGEX, "Slug invalide (a-z, 0-9, tirets).")
    .max(80),
  logoAssetId: z.string().uuid().nullable().optional().default(null),
  descriptionFr: z.string().trim().max(4000).default(""),
  descriptionEn: z.string().trim().max(4000).default(""),
  foundedYear: z
    .union([z.coerce.number().int().min(1900).max(2100), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  appPlatforms: z
    .array(z.enum(["android", "ios", "web"]))
    .max(3)
    .default(["web"]),
  allowedHosts: z
    .union([z.string(), z.array(z.string())])
    .transform((val) =>
      normalizeAllowedHostsList(Array.isArray(val) ? val : val.split(/[\s,;]+/).filter(Boolean)),
    )
    .refine((hosts) => hosts.length >= 1, {
      message: "Au moins un hôte autorisé valide (ex. betclic.bj) est requis.",
    }),
  status: z.enum(["active", "inactive", "archived"]).default("active"),
});

export const bookmakerCountrySchema = z.object({
  bookmakerId: z.string().uuid(),
  countryId: z.string().uuid(),
  eligible: z.boolean().default(true),
  localLicense: z.string().trim().max(180).default(""),
  authorityName: z.string().trim().max(180).default(""),
  countryScore: optionalNumberString(0, 10),
  notes: z.string().trim().max(1000).default(""),
});

export const bookmakerPaymentMethodSchema = z.object({
  bookmakerId: z.string().uuid(),
  paymentMethodId: z.string().uuid(),
  countryId: z.string().uuid(),
  minDepositAmount: optionalNumberString(0),
  currencyCode: z.string().trim().toUpperCase().regex(CURRENCY_REGEX).default("XOF"),
  supportsDeposit: z.boolean().default(true),
  supportsWithdrawal: z.boolean().default(true),
});

export const bookmakerRatingSchema = z.object({
  bookmakerId: z.string().uuid(),
  gridVersion: z.string().trim().min(1).max(32).default("v1"),
  bonusScore: z.coerce.number().min(0).max(10),
  paymentsScore: z.coerce.number().min(0).max(10),
  oddsScore: z.coerce.number().min(0).max(10),
  appScore: z.coerce.number().min(0).max(10),
  supportScore: z.coerce.number().min(0).max(10),
  notes: z.string().trim().max(2000).default(""),
});

export const offerInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    bookmakerId: z.string().uuid("Bookmaker requis."),
    offerType: z.enum(["welcome", "special", "reload", "cashback"]).default("welcome"),
    slug: z.string().trim().toLowerCase().regex(SLUG_REGEX, "Slug invalide.").max(100),
    titleFr: z.string().trim().min(3, "Titre FR requis.").max(180),
    titleEn: z.string().trim().min(3, "Titre EN requis.").max(180),
    bonusAmount: optionalNumberString(0),
    currencyCode: z.string().trim().toUpperCase().regex(CURRENCY_REGEX).default("XOF"),
    bonusPercentage: z
      .union([z.coerce.number().int().min(0).max(1000), z.literal(""), z.null()])
      .optional()
      .transform((v) => (v === "" || v === undefined ? null : v)),
    minDeposit: optionalNumberString(0),
    rolloverText: z.string().trim().max(400).default(""),
    minOdds: optionalNumberString(1, 100),
    validFrom: optionalDateSchema,
    validUntil: optionalDateSchema,
    badgeCode: z.string().trim().max(40).nullable().optional().default(null),
    rankOrder: z.coerce.number().int().min(1).max(10000).default(100),
    countryIds: z
      .array(z.string().uuid())
      .min(1, "Sélectionnez au moins un pays éligible.")
      .max(260),
  })
  .refine((data) => !data.validFrom || !data.validUntil || data.validUntil > data.validFrom, {
    path: ["validUntil"],
    message: "La date de fin doit être postérieure à la date de début.",
  });

export const offerStatusActionSchema = z.object({
  offerId: z.string().uuid(),
  nextStatus: z.enum(["draft", "published", "expired", "disabled", "archived"]),
});

export const offerTermSchema = z.object({
  offerId: z.string().uuid(),
  locale: z.enum(["fr", "en"]).default("fr"),
  title: z.string().trim().min(2).max(160),
  body: z.string().trim().min(2).max(4000),
  sortOrder: z.coerce.number().int().min(0).max(100).default(0),
});

export const offerHighlightSchema = z.object({
  offerId: z.string().uuid(),
  locale: z.enum(["fr", "en"]).default("fr"),
  polarity: z.enum(["positive", "negative"]).default("positive"),
  label: z.string().trim().min(2).max(240),
  sortOrder: z.coerce.number().int().min(0).max(100).default(0),
});

export const promoCodeSchema = z
  .object({
    id: z.string().uuid().optional(),
    bookmakerId: z.string().uuid(),
    offerId: z.string().uuid().nullable().optional().default(null),
    countryId: z.string().uuid().nullable().optional().default(null),
    code: z.string().trim().toUpperCase().min(2).max(48),
    description: z.string().trim().max(500).default(""),
    validFrom: optionalDateSchema,
    validUntil: optionalDateSchema,
    status: z.enum(["active", "expired", "disabled", "archived"]).default("active"),
  })
  .refine((data) => !data.validFrom || !data.validUntil || data.validUntil > data.validFrom, {
    path: ["validUntil"],
    message: "La date de fin doit être postérieure à la date de début.",
  });

export const affiliateNetworkSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(SLUG_REGEX, "Slug réseau invalide.")
    .max(80)
    .optional(),
  name: z.string().trim().min(2).max(100),
  bookmakerId: z.string().uuid().nullable().optional().default(null),
  adapterKey: z.enum(["1xpartners", "1win", "generic"]).default("generic"),
  trackingMode: z.enum(["postback", "webhook", "import", "none"]).default("none"),
  subIdParamName: z.string().trim().min(1).max(40).default("subid"),
  secretEnvRef: z
    .string()
    .trim()
    .max(80)
    .default("")
    .refine(
      (val) => val === "" || /^AFFILIATE_[A-Z0-9_]{2,64}$/.test(val),
      "La référence doit suivre le format AFFILIATE_<NOM>.",
    ),
  signatureMode: z.enum(["token", "hmac_sha256", "none"]).default("token"),
  signatureHeader: z.string().trim().max(80).default(""),
  allowedIps: z.array(z.string().trim().min(3).max(64)).max(50).default([]),
  timestampToleranceSeconds: z.number().int().min(30).max(3600).default(300),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const affiliateLinkSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().trim().toLowerCase().regex(SLUG_REGEX, "Slug invalide.").max(100),
  bookmakerId: z.string().uuid(),
  countryId: z.string().uuid().nullable().optional().default(null),
  offerId: z.string().uuid().nullable().optional().default(null),
  networkId: z.string().uuid().nullable().optional().default(null),
  destinationUrl: z.string().trim().url("URL invalide.").max(1000),
  active: z.boolean().default(true),
  status: z.enum(["active", "disabled", "archived"]).default("active"),
});

export const countryUpdateSchema = z.object({
  id: z.string().uuid(),
  currencyCode: z.string().trim().toUpperCase().regex(CURRENCY_REGEX),
  defaultLocale: z.enum(["fr", "en"]),
  active: z.boolean(),
});

export const catalogDeleteSchema = z.object({
  entityId: z.string().uuid(),
  confirmationName: z.string().trim().min(1),
});
