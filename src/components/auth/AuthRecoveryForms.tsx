"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AuthForm, type AuthFormStatus } from "@/components/auth/AuthForm";
import { PasswordField } from "@/components/auth/PasswordField";
import { postAuthJson } from "@/components/auth/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  forgotPasswordSchema,
  resendVerificationSchema,
  resetPasswordSchema,
} from "@/modules/auth/schema";

export function ForgotPasswordForm() {
  const locale = useLocale() === "en" ? "en" : "fr";
  const t = useTranslations("auth.forgot");
  const tFields = useTranslations("auth.fields");

  const [email, setEmail] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [status, setStatus] = React.useState<AuthFormStatus | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    const parsed = forgotPasswordSchema.safeParse({ email, locale });
    if (!parsed.success) {
      setStatus({
        kind: "error",
        message: parsed.error.issues[0]?.message ?? "Adresse e-mail invalide.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await postAuthJson(
        "/api/auth/forgot-password",
        parsed.data,
        locale === "en" ? "Request failed." : "Échec de la demande.",
      );
      setStatus({ kind: result.ok ? "success" : "error", message: result.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthForm
      title={t("title")}
      description={t("description")}
      status={status}
      onSubmit={handleSubmit}
      footer={
        <Link href="/connexion" className="text-accent hover:underline">
          {t("backToSignIn")}
        </Link>
      }
    >
      <div className="space-y-1.5">
        <label htmlFor="forgot-email" className="block text-sm font-medium text-fg">
          {tFields("email")}
        </label>
        <Input
          id="forgot-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder={tFields("emailPlaceholder")}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? t("submitting") : t("submit")}
      </Button>
    </AuthForm>
  );
}

export function ResetPasswordForm() {
  const locale = useLocale() === "en" ? "en" : "fr";
  const router = useRouter();
  const t = useTranslations("auth.reset");
  const tFields = useTranslations("auth.fields");

  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [status, setStatus] = React.useState<AuthFormStatus | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    const parsed = resetPasswordSchema.safeParse({ password, locale });
    if (!parsed.success) {
      setStatus({
        kind: "error",
        message: parsed.error.issues[0]?.message ?? "Mot de passe invalide.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await postAuthJson(
        "/api/auth/reset-password",
        parsed.data,
        locale === "en" ? "Reset failed." : "Échec de la réinitialisation.",
      );
      if (!result.ok) {
        setStatus({ kind: "error", message: result.message });
        return;
      }
      setStatus({ kind: "success", message: result.message });
      if (result.redirectTo) {
        router.push(result.redirectTo);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthForm
      title={t("title")}
      description={t("description")}
      status={status}
      onSubmit={handleSubmit}
      footer={
        <Link href="/connexion" className="text-accent hover:underline">
          {t("backToSignIn")}
        </Link>
      }
    >
      <PasswordField
        id="reset-password"
        name="password"
        label={tFields("newPassword")}
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        showStrengthHint
      />

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? t("submitting") : t("submit")}
      </Button>
    </AuthForm>
  );
}

export function VerificationForm({ initialError }: { initialError?: string }) {
  const locale = useLocale() === "en" ? "en" : "fr";
  const t = useTranslations("auth.verification");
  const tFields = useTranslations("auth.fields");

  const [email, setEmail] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [status, setStatus] = React.useState<AuthFormStatus | null>(
    initialError ? { kind: "error", message: t("invalidToken") } : null,
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    const parsed = resendVerificationSchema.safeParse({ email, locale });
    if (!parsed.success) {
      setStatus({
        kind: "error",
        message: parsed.error.issues[0]?.message ?? "Adresse e-mail invalide.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await postAuthJson(
        "/api/auth/resend-verification",
        parsed.data,
        locale === "en"
          ? "Unable to resend verification email."
          : "Impossible de renvoyer l'e-mail.",
      );
      setStatus({ kind: result.ok ? "success" : "error", message: result.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthForm
      title={t("title")}
      description={t("description")}
      status={status}
      onSubmit={handleSubmit}
      footer={
        <Link href="/connexion" className="text-accent hover:underline">
          {t("backToSignIn")}
        </Link>
      }
    >
      <div className="space-y-1.5">
        <label htmlFor="verify-email" className="block text-sm font-medium text-fg">
          {tFields("email")}
        </label>
        <Input
          id="verify-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder={tFields("emailPlaceholder")}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? t("submitting") : t("submit")}
      </Button>
    </AuthForm>
  );
}
