"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AuthForm, type AuthFormStatus } from "@/components/auth/AuthForm";
import { PasswordField } from "@/components/auth/PasswordField";
import { postAuthJson } from "@/components/auth/auth-client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { signInSchema, signUpSchema } from "@/modules/auth/schema";

export function SignInForm({ nextPath }: { nextPath?: string }) {
  const locale = useLocale() === "en" ? "en" : "fr";
  const router = useRouter();
  const t = useTranslations("auth.signIn");
  const tFields = useTranslations("auth.fields");

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [status, setStatus] = React.useState<AuthFormStatus | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    const parsed = signInSchema.safeParse({ email, password, locale, next: nextPath });
    if (!parsed.success) {
      setStatus({
        kind: "error",
        message: parsed.error.issues[0]?.message ?? "Formulaire invalide.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await postAuthJson(
        "/api/auth/sign-in",
        parsed.data,
        locale === "en" ? "Unable to sign in." : "Impossible de finaliser la connexion.",
      );
      if (!result.ok) {
        setStatus({ kind: "error", message: result.message });
        return;
      }
      router.push(result.redirectTo ?? `/${locale}/compte`);
      router.refresh();
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href="/mot-de-passe-oublie" className="text-accent hover:underline">
            {t("forgotLink")}
          </Link>
          <span>
            {t("noAccount")}{" "}
            <Link href="/inscription" className="font-medium text-accent hover:underline">
              {t("signUpLink")}
            </Link>
          </span>
        </div>
      }
    >
      <div className="space-y-1.5">
        <label htmlFor="signin-email" className="block text-sm font-medium text-fg">
          {tFields("email")}
        </label>
        <Input
          id="signin-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder={tFields("emailPlaceholder")}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <PasswordField
        id="signin-password"
        name="password"
        label={tFields("password")}
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
      />

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? t("submitting") : t("submit")}
      </Button>
    </AuthForm>
  );
}

export function SignUpForm({ initialCountry = "GLOBAL" }: { initialCountry?: string }) {
  const locale = useLocale() === "en" ? "en" : "fr";
  const router = useRouter();
  const t = useTranslations("auth.signUp");
  const tFields = useTranslations("auth.fields");

  const [displayName, setDisplayName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [acceptAnalytics, setAcceptAnalytics] = React.useState(false);
  const [acceptNotifications, setAcceptNotifications] = React.useState(false);
  const [acceptMarketing, setAcceptMarketing] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [status, setStatus] = React.useState<AuthFormStatus | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    const parsed = signUpSchema.safeParse({
      email,
      password,
      displayName,
      countryCode: initialCountry,
      locale,
      acceptAnalytics,
      acceptNotifications,
      acceptMarketing,
    });
    if (!parsed.success) {
      setStatus({
        kind: "error",
        message: parsed.error.issues[0]?.message ?? "Formulaire invalide.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await postAuthJson(
        "/api/auth/sign-up",
        parsed.data,
        locale === "en" ? "Unable to create account." : "Impossible de créer le compte.",
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
        <p className="text-center">
          {t("hasAccount")}{" "}
          <Link href="/connexion" className="font-medium text-accent hover:underline">
            {t("signInLink")}
          </Link>
        </p>
      }
    >
      <div className="space-y-1.5">
        <label htmlFor="signup-name" className="block text-sm font-medium text-fg">
          {tFields("displayName")}
        </label>
        <Input
          id="signup-name"
          name="displayName"
          type="text"
          autoComplete="name"
          required
          placeholder={tFields("displayNamePlaceholder")}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="signup-email" className="block text-sm font-medium text-fg">
          {tFields("email")}
        </label>
        <Input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder={tFields("emailPlaceholder")}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <PasswordField
        id="signup-password"
        name="password"
        label={tFields("password")}
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        showStrengthHint
      />

      <div className="space-y-2.5 pt-1">
        <Checkbox
          label={tFields("consentAnalytics")}
          checked={acceptAnalytics}
          onChange={(event) => setAcceptAnalytics(event.target.checked)}
        />
        <Checkbox
          label={tFields("consentNotifications")}
          checked={acceptNotifications}
          onChange={(event) => setAcceptNotifications(event.target.checked)}
        />
        <Checkbox
          label={tFields("consentMarketing")}
          checked={acceptMarketing}
          onChange={(event) => setAcceptMarketing(event.target.checked)}
        />
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? t("submitting") : t("submit")}
      </Button>
    </AuthForm>
  );
}
