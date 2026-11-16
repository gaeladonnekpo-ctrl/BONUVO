"use server";

import { headers } from "next/headers";
import { getServerEnv } from "@/server/env";
import { extractTrustedClientIp } from "@/server/security/ip";
import {
  forgotPasswordSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  totpVerifySchema,
} from "@/modules/auth/schema";
import {
  createDefaultAuthDeps,
  signInWithRateLimit,
  signUpWithRateLimit,
  type AuthActionResponse,
} from "@/modules/auth/service";
import {
  completePasswordReset,
  requestPasswordResetNeutral,
} from "@/modules/auth/recovery-service";
import {
  enrollTotpFactor,
  resendVerificationEmail,
  signOutCurrentUser,
  verifyTotpChallenge,
} from "@/modules/auth/mfa-service";

async function resolveActionIp(): Promise<string> {
  const reqHeaders = await headers();
  const env = getServerEnv();
  return extractTrustedClientIp(reqHeaders, env.APP_ENV);
}

export async function signUpAction(rawInput: unknown): Promise<AuthActionResponse> {
  const parsed = signUpSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      code: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }
  const [ip, deps] = await Promise.all([resolveActionIp(), createDefaultAuthDeps()]);
  return signUpWithRateLimit(parsed.data, ip, deps);
}

export async function signInAction(
  rawInput: unknown,
): Promise<AuthActionResponse<{ requiresTotp: boolean }>> {
  const parsed = signInSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      code: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }
  const [ip, deps] = await Promise.all([resolveActionIp(), createDefaultAuthDeps()]);
  return signInWithRateLimit(parsed.data, ip, deps);
}

export async function signOutAction(locale: "fr" | "en" = "fr"): Promise<AuthActionResponse> {
  const [ip, deps] = await Promise.all([resolveActionIp(), createDefaultAuthDeps()]);
  return signOutCurrentUser(locale, ip, deps);
}

export async function requestPasswordResetAction(rawInput: unknown): Promise<AuthActionResponse> {
  const parsed = forgotPasswordSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      code: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Adresse e-mail invalide.",
    };
  }
  const [ip, deps] = await Promise.all([resolveActionIp(), createDefaultAuthDeps()]);
  return requestPasswordResetNeutral(parsed.data, ip, deps);
}

export async function resetPasswordAction(rawInput: unknown): Promise<AuthActionResponse> {
  const parsed = resetPasswordSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      code: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Mot de passe invalide.",
    };
  }
  const [ip, deps] = await Promise.all([resolveActionIp(), createDefaultAuthDeps()]);
  return completePasswordReset(parsed.data, ip, deps);
}

export async function resendVerificationAction(rawInput: unknown): Promise<AuthActionResponse> {
  const parsed = resendVerificationSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      code: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Adresse e-mail invalide.",
    };
  }
  const [ip, deps] = await Promise.all([resolveActionIp(), createDefaultAuthDeps()]);
  return resendVerificationEmail(parsed.data, ip, deps);
}

export async function enrollTotpAction(
  locale: "fr" | "en" = "fr",
): Promise<AuthActionResponse<{ factorId: string; qrCode: string; secret: string }>> {
  const [ip, deps] = await Promise.all([resolveActionIp(), createDefaultAuthDeps()]);
  return enrollTotpFactor(locale, ip, deps);
}

export async function verifyTotpAction(rawInput: unknown): Promise<AuthActionResponse> {
  const parsed = totpVerifySchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      code: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Code TOTP invalide.",
    };
  }
  const [ip, deps] = await Promise.all([resolveActionIp(), createDefaultAuthDeps()]);
  return verifyTotpChallenge(parsed.data, ip, deps);
}
