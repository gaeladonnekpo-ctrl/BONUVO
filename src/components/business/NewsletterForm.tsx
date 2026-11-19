"use client";

import { CheckCircle2, Globe, Mail, Phone, User } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { COUNTRY_OPTIONS, formatCountryDisplay } from "@/lib/i18n/countries";

export interface NewsletterFormProps {
  locale: "fr" | "en";
  initialCountry?: string;
}

export function NewsletterForm({ locale, initialCountry = "GLOBAL" }: NewsletterFormProps) {
  const isFr = locale === "fr";
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [countryCode, setCountryCode] = React.useState(initialCountry || "GLOBAL");
  const [consentGranted, setConsentGranted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successData, setSuccessData] = React.useState<{
    alreadySubscribed: boolean;
    reactivated: boolean;
    unsubscribeUrl: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    if (!consentGranted) {
      setErrorMessage(
        isFr
          ? "Veuillez cocher la case de consentement pour recevoir nos communications."
          : "Please check the consent box to receive our communications.",
      );
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          countryCode,
          locale,
          consentGranted: true,
        }),
      });
      const json = (await response.json()) as {
        ok?: boolean;
        alreadySubscribed?: boolean;
        reactivated?: boolean;
        unsubscribeUrl?: string;
        error?: { message?: string };
      };

      if (!response.ok || !json.ok) {
        setErrorMessage(
          json.error?.message ||
            (isFr
              ? "Une erreur est survenue lors de l'enregistrement. Veuillez vérifier vos informations."
              : "An error occurred while saving your subscription. Please check your details."),
        );
        return;
      }

      setSuccessData({
        alreadySubscribed: Boolean(json.alreadySubscribed),
        reactivated: Boolean(json.reactivated),
        unsubscribeUrl: json.unsubscribeUrl || `/${locale}/desinscription`,
      });
    } catch {
      setErrorMessage(
        isFr
          ? "Impossible de contacter le serveur. Veuillez réessayer."
          : "Unable to reach the server. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (successData) {
    return (
      <div role="status" className="space-y-4 py-4 text-center sm:py-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-trust/15 text-trust">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </div>
        <h3 className="font-display text-xl font-bold text-fg">
          {successData.alreadySubscribed
            ? isFr
              ? "Vos informations ont bien été mises à jour !"
              : "Your subscriber profile has been updated!"
            : successData.reactivated
              ? isFr
                ? "Votre abonnement a été réactivé avec succès !"
                : "Your subscription has been reactivated!"
              : isFr
                ? "Inscription confirmée à la newsletter BONUVO !"
                : "Welcome to the BONUVO newsletter!"}
        </h3>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-fg-muted">
          {isFr
            ? "Vos coordonnées ont été enregistrées en toute sécurité. Vous recevrez nos prochaines actualités, offres vérifiées et nouveautés selon votre pays."
            : "Your details have been securely saved. You will receive our upcoming news, verified offers and platform updates for your country."}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setSuccessData(null)}>
            {isFr ? "Modifier mes informations" : "Edit my details"}
          </Button>
          <Link
            href={successData.unsubscribeUrl}
            className="text-xs font-medium text-fg-muted underline underline-offset-4 hover:text-fg"
          >
            {isFr ? "Se désabonner en 1 clic" : "1-click unsubscribe"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <label className="block space-y-1.5 text-xs font-semibold text-fg">
          <span>{isFr ? "Nom et prénom *" : "Full name *"}</span>
          <div className="relative">
            <User
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-fg-muted"
              aria-hidden="true"
            />
            <input
              type="text"
              name="fullName"
              required
              minLength={2}
              maxLength={120}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={isFr ? "Ex. Jean Kouassi" : "e.g. Alex Mensah"}
              className="h-11 w-full rounded-xl border border-border bg-bg pr-3 pl-9 text-sm text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none"
            />
          </div>
        </label>

        <label className="block space-y-1.5 text-xs font-semibold text-fg">
          <span>{isFr ? "Adresse e-mail *" : "Email address *"}</span>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-fg-muted"
              aria-hidden="true"
            />
            <input
              type="email"
              name="email"
              required
              maxLength={180}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isFr ? "vous@exemple.com" : "you@example.com"}
              className="h-11 w-full rounded-xl border border-border bg-bg pr-3 pl-9 text-sm text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none"
            />
          </div>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <label className="block space-y-1.5 text-xs font-semibold text-fg">
          <span>{isFr ? "Numéro de téléphone (facultatif)" : "Phone number (optional)"}</span>
          <div className="relative">
            <Phone
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-fg-muted"
              aria-hidden="true"
            />
            <input
              type="tel"
              name="phone"
              maxLength={30}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+229 / +225 / +33..."
              className="h-11 w-full rounded-xl border border-border bg-bg pr-3 pl-9 text-sm text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none"
            />
          </div>
        </label>

        <label className="block space-y-1.5 text-xs font-semibold text-fg">
          <span>{isFr ? "Pays de résidence *" : "Country of residence *"}</span>
          <div className="relative">
            <Globe
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-fg-muted"
              aria-hidden="true"
            />
            <select
              name="countryCode"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-bg pr-3 pl-9 text-sm text-fg focus:border-accent focus:outline-none"
            >
              {COUNTRY_OPTIONS.map((c) => {
                const label = formatCountryDisplay(
                  c,
                  locale,
                  isFr ? "International (Tous pays)" : "International (All countries)",
                );
                return (
                  <option key={c.code} value={c.code}>
                    {c.code === "GLOBAL" ? label : `${label} (${c.code})`}
                  </option>
                );
              })}
            </select>
          </div>
        </label>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface-subtle/60 p-3 text-xs leading-relaxed text-fg">
        <input
          type="checkbox"
          name="consentGranted"
          checked={consentGranted}
          onChange={(e) => setConsentGranted(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-accent"
        />
        <span>
          {isFr
            ? "J'accepte explicitement de recevoir les actualités, nouvelles offres, annonces et communications de BONUVO. Je peux me désabonner gratuitement à tout moment."
            : "I explicitly agree to receive BONUVO news, verified offers, announcements and communications. I can unsubscribe at any time."}
        </span>
      </label>

      {errorMessage ? (
        <p
          role="alert"
          className="rounded-xl border border-danger/40 bg-danger-soft px-3.5 py-2.5 text-xs font-medium text-danger"
        >
          {errorMessage}
        </p>
      ) : null}

      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
        {submitting
          ? isFr
            ? "Enregistrement en cours..."
            : "Saving..."
          : isFr
            ? "S'inscrire à la newsletter BONUVO"
            : "Subscribe to the BONUVO newsletter"}
      </Button>
    </form>
  );
}
