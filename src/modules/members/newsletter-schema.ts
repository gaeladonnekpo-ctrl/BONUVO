import { z } from "zod";

export const newsletterSubscriptionSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Veuillez renseigner votre nom et prénom.")
    .max(120, "Nom trop long (120 caractères max).")
    .transform((v) => v.replace(/[<>]/g, "")),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Veuillez saisir une adresse e-mail valide.")
    .max(180, "Adresse e-mail trop longue."),
  phone: z
    .string()
    .trim()
    .max(30, "Numéro de téléphone trop long.")
    .regex(/^[+0-9 ().\-]*$/, "Format de numéro de téléphone invalide.")
    .optional()
    .default(""),
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^([A-Z]{2}|GLOBAL)$/, "Code pays invalide.")
    .optional()
    .default("GLOBAL"),
  locale: z.enum(["fr", "en"]).optional().default("fr"),
  consentGranted: z.literal(true, {
    error: "Vous devez accepter de recevoir nos communications pour vous inscrire.",
  }),
});

export type NewsletterSubscriptionInput = z.infer<typeof newsletterSubscriptionSchema>;
