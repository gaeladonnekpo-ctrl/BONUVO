"use client";

import { CheckCircle2, Mail } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";

export function NewsletterEmailUnsubscribeForm({ locale }: { locale: "fr" | "en" }) {
  const isFr = locale === "fr";
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unsubscribe", email }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: { message?: string } };
      if (!res.ok || !json.ok) {
        setError(
          json.error?.message ||
            (isFr ? "Veuillez saisir une adresse e-mail valide." : "Please enter a valid email."),
        );
        return;
      }
      setDone(true);
    } catch {
      setError(
        isFr
          ? "Impossible de traiter votre demande. Veuillez réessayer."
          : "Unable to process your request. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div
        role="status"
        className="mt-4 flex items-start gap-2.5 rounded-xl border border-trust/40 bg-trust-soft p-3.5 text-xs text-trust"
      >
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          {isFr
            ? "Votre adresse e-mail a bien été retirée de notre liste de diffusion newsletter."
            : "Your email address has been removed from our newsletter mailing list."}
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 border-t border-border pt-4">
      <label className="block space-y-1.5 text-xs font-semibold text-fg">
        <span>
          {isFr
            ? "Se désabonner de la newsletter par adresse e-mail"
            : "Unsubscribe from the newsletter by email"}
        </span>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-fg-muted"
            aria-hidden="true"
          />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={isFr ? "vous@exemple.com" : "you@example.com"}
            className="h-10 w-full rounded-xl border border-border bg-bg pr-3 pl-9 text-sm text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none"
          />
        </div>
      </label>
      {error ? (
        <p role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" variant="primary" size="sm" disabled={loading}>
        {loading
          ? isFr
            ? "Désabonnement..."
            : "Unsubscribing..."
          : isFr
            ? "Me désabonner de la newsletter"
            : "Unsubscribe from newsletter"}
      </Button>
    </form>
  );
}
