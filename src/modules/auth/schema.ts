import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

const COMMON_COMPROMISED_PASSWORDS = new Set([
  "password1234",
  "password123456",
  "123456789012",
  "azerty123456",
  "qwerty123456",
  "bonuvo123456",
  "admin12345678",
  "welcome123456",
  "motdepasse123",
  "iloveyou1234",
]);

export function validateStrongPassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return "PASSWORD_TOO_SHORT";
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return "PASSWORD_TOO_LONG";
  }
  const normalized = password.trim().toLowerCase();
  if (COMMON_COMPROMISED_PASSWORDS.has(normalized)) {
    return "PASSWORD_COMPROMISED";
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return "PASSWORD_WEAK_COMPLEXITY";
  }
  return null;
}

export const strongPasswordSchema = z
  .string()
  .min(
    PASSWORD_MIN_LENGTH,
    `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`,
  )
  .max(PASSWORD_MAX_LENGTH, "Le mot de passe est trop long.")
  .superRefine((value, ctx) => {
    const issue = validateStrongPassword(value);
    if (issue === "PASSWORD_COMPROMISED") {
      ctx.addIssue({
        code: "custom",
        message: "Ce mot de passe figure parmi les mots de passe faibles ou compromis connus.",
      });
    } else if (issue === "PASSWORD_WEAK_COMPLEXITY") {
      ctx.addIssue({
        code: "custom",
        message:
          "Le mot de passe doit inclure au moins une lettre minuscule, une majuscule et un chiffre.",
      });
    }
  });

export const authLocaleSchema = z.enum(["fr", "en"]).default("fr");

export const signInSchema = z.object({
  email: z.string().trim().email("Adresse e-mail invalide.").max(254).toLowerCase(),
  password: z.string().min(1, "Mot de passe requis.").max(PASSWORD_MAX_LENGTH),
  locale: authLocaleSchema,
  next: z.string().max(256).optional(),
});

export const signUpSchema = z.object({
  email: z.string().trim().email("Adresse e-mail invalide.").max(254).toLowerCase(),
  password: strongPasswordSchema,
  displayName: z
    .string()
    .trim()
    .min(2, "Nom affiché trop court.")
    .max(80, "Nom affiché trop long."),
  countryCode: z.string().trim().min(2).max(8).default("GLOBAL"),
  locale: authLocaleSchema,
  acceptAnalytics: z.boolean().default(false),
  acceptNotifications: z.boolean().default(false),
  acceptMarketing: z.boolean().default(false),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Adresse e-mail invalide.").max(254).toLowerCase(),
  locale: authLocaleSchema,
});

export const resetPasswordSchema = z.object({
  password: strongPasswordSchema,
  locale: authLocaleSchema,
});

export const resendVerificationSchema = z.object({
  email: z.string().trim().email("Adresse e-mail invalide.").max(254).toLowerCase(),
  locale: authLocaleSchema,
});

export const totpVerifySchema = z.object({
  factorId: z.string().uuid("Identifiant de facteur TOTP invalide."),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Le code TOTP doit contenir 6 chiffres."),
  locale: authLocaleSchema,
  next: z.string().max(256).optional(),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type TotpVerifyInput = z.infer<typeof totpVerifySchema>;
