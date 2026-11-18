import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { logAudit, logSecurityEvent } from "@/server/audit/log";
import { loadOrBootstrapProfileContext } from "@/server/auth/session";
import { hashIdentifier } from "@/server/security/ip";
import { recordConsentDecisions } from "@/modules/auth/repository";
import type { SignUpInput } from "@/modules/auth/schema";

export async function executeSignUpProvisioning(params: {
  input: SignUpInput;
  ipHash: string;
  ipHashSecret: string;
  siteUrl: string;
  supabase: SupabaseClient;
  adminSupabase: SupabaseClient | null;
}) {
  const { input, ipHash, ipHashSecret, siteUrl, supabase, adminSupabase } = params;
  let createdUser: { id: string; emailConfirmedAt: Date | null } | null = null;
  let hasActiveSession = false;

  if (adminSupabase) {
    const { data: created, error: createError } = await adminSupabase.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        display_name: input.displayName,
        locale: input.locale,
        country: input.countryCode,
      },
    });

    if (createError && (createError.status ?? 0) >= 500) {
      await logSecurityEvent({
        eventType: "signup_provider_error",
        severity: "high",
        ipHash,
        identifierHash: hashIdentifier(input.email, ipHashSecret),
        route: "/api/auth/sign-up",
        details: {
          status: createError.status ?? 500,
          code: createError.code ?? "unexpected_failure",
        },
      });
      return {
        ok: false as const,
        status: 503,
        code: "SIGNUP_DELIVERY_UNAVAILABLE",
        message:
          input.locale === "en"
            ? "Registration is temporarily unavailable. Please retry later."
            : "L'inscription est temporairement indisponible. Veuillez réessayer ultérieurement.",
      };
    }

    if (createError || !created.user) {
      return {
        ok: true as const,
        status: 200,
        redirectTo: `/${input.locale}/connexion`,
        message:
          input.locale === "en"
            ? "An account may already exist with this address. Please sign in."
            : "Un compte existe peut-être déjà avec cette adresse. Veuillez vous connecter.",
      };
    }

    createdUser = {
      id: created.user.id,
      emailConfirmedAt: created.user.email_confirmed_at
        ? new Date(created.user.email_confirmed_at)
        : new Date(),
    };

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    hasActiveSession = Boolean(signInData.session && !signInError);
  } else {
    const redirectTo = `${siteUrl}/api/auth/callback?locale=${input.locale}&next=/${input.locale}`;
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: redirectTo,
        data: { display_name: input.displayName, locale: input.locale, country: input.countryCode },
      },
    });

    if (error && (error.status ?? 0) >= 500) {
      await logSecurityEvent({
        eventType: "signup_provider_error",
        severity: "high",
        ipHash,
        identifierHash: hashIdentifier(input.email, ipHashSecret),
        route: "/api/auth/sign-up",
        details: { status: error.status ?? 500, code: error.code ?? "unexpected_failure" },
      });
      return {
        ok: false as const,
        status: 503,
        code: "SIGNUP_DELIVERY_UNAVAILABLE",
        message:
          input.locale === "en"
            ? "Registration is temporarily unavailable (verification e-mail delivery failed). Please retry later."
            : "L'inscription est temporairement indisponible (échec d'envoi de l'e-mail de confirmation). Veuillez réessayer ultérieurement.",
      };
    }

    if (data.user && !error) {
      createdUser = {
        id: data.user.id,
        emailConfirmedAt: data.user.email_confirmed_at
          ? new Date(data.user.email_confirmed_at)
          : null,
      };
      hasActiveSession = Boolean(data.session);
    }
  }

  if (createdUser) {
    await loadOrBootstrapProfileContext({
      userId: createdUser.id,
      email: input.email,
      displayName: input.displayName,
      emailVerifiedAt: createdUser.emailConfirmedAt,
    });
    await recordConsentDecisions({
      userId: createdUser.id,
      ipHash,
      policyVersion: "2026-11-phase-2",
      decisions: [
        { type: "analytics", granted: input.acceptAnalytics },
        { type: "notifications", granted: input.acceptNotifications },
        { type: "marketing_email", granted: input.acceptMarketing },
      ],
    });
    await logAudit({
      actorId: createdUser.id,
      action: "user.registered",
      entityType: "profiles",
      entityId: createdUser.id,
      beforeState: null,
      afterState: { locale: input.locale, countryCode: input.countryCode },
      ipHash,
    });
  }

  return {
    ok: true as const,
    status: 200,
    redirectTo: hasActiveSession ? `/${input.locale}` : `/${input.locale}/verification`,
    message: hasActiveSession
      ? input.locale === "en"
        ? "Account created! Redirecting to home..."
        : "Compte créé avec succès ! Redirection vers l'accueil..."
      : input.locale === "en"
        ? "If this address is eligible, a verification e-mail has been sent."
        : "Si cette adresse est recevable, un e-mail de vérification vient d'être envoyé.",
  };
}
