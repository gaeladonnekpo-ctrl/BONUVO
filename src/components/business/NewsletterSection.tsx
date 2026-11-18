import { BellRing, Gift, Mail, Megaphone, Sparkles } from "lucide-react";
import Link from "next/link";
import { NewsletterForm } from "@/components/business/NewsletterForm";

export interface NewsletterSectionProps {
  locale: "fr" | "en";
  initialCountry?: string;
}

export function NewsletterSection({ locale, initialCountry = "GLOBAL" }: NewsletterSectionProps) {
  const isFr = locale === "fr";

  const benefits = isFr
    ? [
        { icon: Sparkles, text: "Les actualités et mises à jour de l'application" },
        { icon: Sparkles, text: "Les nouvelles fonctionnalités et outils BONUVO AI disponibles" },
        { icon: Gift, text: "Les nouvelles offres vérifiées, bonus et opportunités" },
        {
          icon: Megaphone,
          text: "Les annonces importantes et les communications de la plateforme",
        },
        {
          icon: BellRing,
          text: "Les avantages exclusifs et nouveautés proposés aux utilisateurs",
        },
      ]
    : [
        { icon: Sparkles, text: "Application news and platform updates" },
        { icon: Sparkles, text: "New features and BONUVO AI tools as soon as they launch" },
        { icon: Gift, text: "New verified bookmaker offers, bonuses and opportunities" },
        { icon: Megaphone, text: "Important announcements and official platform communications" },
        { icon: BellRing, text: "Exclusive perks and new benefits for subscribers" },
      ];

  return (
    <section
      id="newsletter"
      aria-labelledby="newsletter-heading"
      className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-surface via-surface-subtle to-accent/10 p-5 shadow-[var(--shadow-card)] sm:p-8 lg:p-10"
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
        <div className="space-y-4 lg:col-span-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3.5 py-1 text-xs font-bold tracking-wider text-accent uppercase">
            <Mail className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{isFr ? "Newsletter & Alertes BONUVO" : "BONUVO Newsletter & Alerts"}</span>
          </span>

          <h2
            id="newsletter-heading"
            className="font-display text-2xl font-extrabold tracking-tight text-fg sm:text-3xl"
          >
            {isFr
              ? "Restez informé des meilleures offres, nouveautés et pronostics"
              : "Stay informed of the best offers, new features and forecasts"}
          </h2>

          <p className="text-sm leading-relaxed text-fg-muted sm:text-base">
            {isFr
              ? "L'accès à BONUVO est 100 % libre et sans compte obligatoire. Inscrivez-vous volontairement à notre newsletter pour recevoir directement :"
              : "Access to BONUVO is 100% free with no mandatory account. Voluntarily join our newsletter to receive:"}
          </p>

          <ul className="space-y-2.5 pt-1 text-sm text-fg">
            {benefits.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.text} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-trust/15 text-trust">
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <span>{item.text}</span>
                </li>
              );
            })}
          </ul>

          <p className="pt-1 text-xs text-fg-muted">
            {isFr ? "Vous êtes déjà abonné et souhaitez vous désinscrire ? " : "Want to opt out? "}
            <Link
              href={`/${locale}/desinscription`}
              className="font-semibold text-fg underline underline-offset-4 hover:text-accent"
            >
              {isFr ? "Se désabonner à tout moment" : "Unsubscribe anytime"}
            </Link>
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs sm:p-6 lg:col-span-6">
          <NewsletterForm locale={locale} initialCountry={initialCountry} />
        </div>
      </div>
    </section>
  );
}
