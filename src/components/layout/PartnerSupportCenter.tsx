"use client";

import * as React from "react";
import Image from "next/image";
import {
  AlertTriangle,
  Headphones,
  LifeBuoy,
  Mail,
  MessageCircle,
  Phone,
  ShieldAlert,
} from "lucide-react";
import { UiBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  PARTNER_SUPPORT_PROFILES,
  SUPPORT_SCENARIO_GUIDES,
} from "@/modules/offers/partner-support-data";

export function PartnerSupportCenter({
  locale = "fr",
  logosBySlug = {},
  shortCodesBySlug = {},
}: {
  locale?: string;
  logosBySlug?: Record<string, string | null>;
  shortCodesBySlug?: Record<string, string>;
}) {
  const isEn = locale === "en";
  const [selectedSlug, setSelectedSlug] = React.useState<string>("all");
  const [activeScenarioId, setActiveScenarioId] = React.useState<string>(
    SUPPORT_SCENARIO_GUIDES[0]?.id ?? "deposit",
  );

  const visiblePartners =
    selectedSlug === "all"
      ? PARTNER_SUPPORT_PROFILES
      : PARTNER_SUPPORT_PROFILES.filter((p) => p.slug === selectedSlug);

  const activeScenario =
    SUPPORT_SCENARIO_GUIDES.find((s) => s.id === activeScenarioId) ?? SUPPORT_SCENARIO_GUIDES[0];

  return (
    <section
      aria-labelledby="partner-help-center-heading"
      className="mt-8 space-y-6 rounded-3xl border border-border bg-surface-subtle/40 p-4 sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
            <Headphones className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {isEn ? "Centralized Partner Support" : "3. Besoin d'aide ? · Centre d'assistance"}
            </span>
          </div>
          <h2
            id="partner-help-center-heading"
            className="font-display text-xl font-bold tracking-tight text-fg sm:text-2xl"
          >
            {isEn
              ? "Official Bookmaker Support & Dispute Procedures"
              : "Services clients officiels des partenaires & démarches"}
          </h2>
          <p className="max-w-3xl text-xs leading-relaxed text-fg-muted sm:text-sm">
            {isEn
              ? "Verified support channels, response procedures and escalation steps for every operator listed on BONUVO. Beware of unofficial Telegram or WhatsApp accounts."
              : "Canaux officiels vérifiés, procédures par type de blocage et démarches de réclamation pour chaque bookmaker référencé sur BONUVO. Méfiez-vous des faux comptes Telegram ou WhatsApp non officiels."}
          </p>
        </div>

        <UiBadge tone="trust" className="self-start shrink-0">
          {PARTNER_SUPPORT_PROFILES.length} {isEn ? "verified operators" : "opérateurs vérifiés"}
        </UiBadge>
      </div>

      {/* Warning distinguishing official support from unverified social accounts */}
      <div className="flex items-start gap-2.5 rounded-2xl border border-warning/40 bg-warning-soft/50 px-3.5 py-3 text-xs leading-relaxed text-fg">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
        <p>
          {isEn
            ? "Security notice: Official bookmakers never ask for your password over chat, email, Telegram or WhatsApp. Always verify the domain before sharing ID or payment receipts."
            : "Vigilance sécurité : les services clients officiels ne demandent jamais votre mot de passe. Privilégiez toujours le chat intégré au site/application officiel et méfiez-vous des comptes Telegram ou WhatsApp non vérifiés."}
        </p>
      </div>

      {/* Interactive Problem Playbook Selector */}
      <div className="space-y-3 rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <div className="space-y-1">
          <h3 className="font-display text-sm font-bold text-fg sm:text-base">
            {isEn
              ? "Which channel should you use for your issue?"
              : "Quel canal utiliser selon votre problème ?"}
          </h3>
          <p className="text-xs text-fg-muted">
            {isEn
              ? "Select a situation to view the recommended procedure."
              : "Sélectionnez votre situation pour voir la démarche exacte à suivre."}
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {SUPPORT_SCENARIO_GUIDES.map((sc) => {
            const selected = sc.id === activeScenario?.id;
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => setActiveScenarioId(sc.id)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  selected
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-border bg-surface-subtle text-fg-muted hover:border-border-strong hover:text-fg",
                )}
              >
                {isEn ? sc.titleEn : sc.titleFr}
              </button>
            );
          })}
        </div>

        {activeScenario ? (
          <div className="space-y-2.5 rounded-xl border border-border/80 bg-surface-subtle/50 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-display text-sm font-bold text-fg">
                {isEn ? activeScenario.titleEn : activeScenario.titleFr}
              </span>
              <UiBadge tone="accent">
                {isEn ? activeScenario.recommendedChannelEn : activeScenario.recommendedChannelFr}
              </UiBadge>
            </div>
            <ol className="list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-fg-muted sm:text-sm">
              {(isEn ? activeScenario.stepsEn : activeScenario.stepsFr).map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>

      {/* Filterable Official Bookmaker Support Directory */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedSlug("all")}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              selectedSlug === "all"
                ? "border-accent bg-accent text-accent-fg"
                : "border-border bg-surface text-fg-muted hover:text-fg",
            )}
          >
            {isEn ? "All operators" : "Tous les bookmakers"} ({PARTNER_SUPPORT_PROFILES.length})
          </button>
          {PARTNER_SUPPORT_PROFILES.map((bm) => (
            <button
              key={bm.slug}
              type="button"
              onClick={() => setSelectedSlug(bm.slug)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                selectedSlug === bm.slug
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-border bg-surface text-fg-muted hover:text-fg",
              )}
            >
              {bm.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {visiblePartners.map((bm) => (
            <Card key={bm.slug} className="border-border/90 bg-surface">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    {logosBySlug[bm.slug] ? (
                      <Image
                        src={logosBySlug[bm.slug] as string}
                        alt={bm.name}
                        width={40}
                        height={40}
                        className="h-10 w-10 shrink-0 rounded-full border border-border-strong bg-surface-elevated object-contain p-1"
                      />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface-elevated font-display text-xs font-bold text-accent">
                        {shortCodesBySlug[bm.slug] ?? bm.name.slice(0, 3).toUpperCase()}
                      </span>
                    )}
                    <CardTitle className="truncate text-base font-bold text-fg">
                      {bm.name}
                    </CardTitle>
                  </div>
                  <UiBadge tone="trust" className="shrink-0 gap-1">
                    <MessageCircle className="h-3 w-3" aria-hidden="true" />
                    {bm.liveChat}
                  </UiBadge>
                </div>
                <p className="text-[11px] text-fg-muted">
                  {isEn ? bm.languagesEn : bm.languagesFr}
                </p>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs">
                <div className="flex items-start gap-2">
                  <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
                  <div>
                    <span className="font-semibold text-fg">
                      {isEn ? "General support: " : "Support général : "}
                    </span>
                    <a
                      href={`mailto:${bm.supportEmail}`}
                      className="break-all text-accent underline-offset-2 hover:underline"
                    >
                      {bm.supportEmail}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <ShieldAlert
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-trust"
                    aria-hidden="true"
                  />
                  <div>
                    <span className="font-semibold text-fg">
                      {isEn ? "Security & KYC: " : "Sécurité & KYC : "}
                    </span>
                    {bm.securityEmail ? (
                      <a
                        href={`mailto:${bm.securityEmail}`}
                        className="break-all text-fg-muted underline-offset-2 hover:text-fg hover:underline"
                      >
                        {bm.securityEmail}
                      </a>
                    ) : (
                      <span className="text-fg-muted">
                        {isEn
                          ? "Not publicly listed (use general support)"
                          : "Non communiqué séparément (passer par le support général)"}
                      </span>
                    )}
                  </div>
                </div>

                {bm.specializedEmail ? (
                  <div className="flex items-start gap-2">
                    <LifeBuoy
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fg-muted"
                      aria-hidden="true"
                    />
                    <div>
                      <span className="font-semibold text-fg">
                        {isEn ? bm.specializedEmail.labelEn : bm.specializedEmail.labelFr} :{" "}
                      </span>
                      <span className="break-all text-fg-muted">{bm.specializedEmail.email}</span>
                    </div>
                  </div>
                ) : null}

                <div className="flex items-start gap-2">
                  <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fg-muted" aria-hidden="true" />
                  <div>
                    <span className="font-semibold text-fg">
                      {isEn ? "Phone: " : "Téléphone : "}
                    </span>
                    <span className="text-fg-muted">
                      {bm.phone ??
                        (isEn
                          ? "Not publicly available (use official Live Chat)"
                          : "Non communiqué publiquement (utiliser le chat officiel)")}
                    </span>
                  </div>
                </div>

                <p className="rounded-lg bg-surface-subtle/80 p-2.5 text-[11px] leading-relaxed text-fg-muted">
                  {isEn ? bm.escalationNoteEn : bm.escalationNoteFr}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
