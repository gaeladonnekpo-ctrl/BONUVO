import { z } from "zod";
import { SLUG_REGEX } from "@/modules/offers/schema";

export const PUBLIC_SORT_OPTIONS = ["rank", "rating", "bonus", "recent"] as const;
export type PublicOfferSort = (typeof PUBLIC_SORT_OPTIONS)[number];

export const OFFER_TYPE_FILTER_OPTIONS = [
  "all",
  "welcome",
  "special",
  "reload",
  "cashback",
] as const;
export type OfferTypeFilter = (typeof OFFER_TYPE_FILTER_OPTIONS)[number];

export const publicOffersFilterSchema = z.object({
  pays: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,8}$/)
    .optional(),
  type: z.enum(OFFER_TYPE_FILTER_OPTIONS).default("all"),
  paiement: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{1,40}$/)
    .optional(),
  depotMax: z.coerce.number().min(0).max(1_000_000_000).optional(),
  avecCode: z.boolean().default(false),
  bookmaker: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{1,80}$/)
    .optional(),
  q: z.string().trim().max(80).default(""),
  tri: z.enum(PUBLIC_SORT_OPTIONS).default("rank"),
});

export type PublicOffersFilterInput = z.infer<typeof publicOffersFilterSchema>;

export const publicEventInputSchema = z.object({
  eventType: z.enum(["page_view", "offer_view", "promo_copy"]),
  path: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .refine(
      (val) => val.startsWith("/") && !val.startsWith("//") && !/[\r\n\0]/.test(val),
      "Chemin invalide.",
    ),
  offerId: z.string().uuid().nullable().optional().default(null),
  bookmakerId: z.string().uuid().nullable().optional().default(null),
  promoCodeId: z.string().uuid().nullable().optional().default(null),
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,8}$/)
    .optional(),
});

export type PublicEventInput = z.infer<typeof publicEventInputSchema>;

export const goRedirectSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(SLUG_REGEX, "Slug de lien invalide.")
  .max(100);

export const goCampaignCodeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_-]{1,80}$/)
  .optional();

export const compareSlugsSchema = z
  .array(z.string().trim().toLowerCase().regex(SLUG_REGEX).max(100))
  .max(3);
