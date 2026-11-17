"use client";

import * as React from "react";
import { ArrowUpRight, Layers, ShieldAlert, Sparkles, Target } from "lucide-react";
import { UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type {
  CombinedCouponDto,
  GamingCategoryGuide,
  SingleBetSuggestion,
} from "@/modules/ai/model/coupons";

function RiskBadge({ riskLevel, isEn }: { riskLevel: "low" | "medium" | "high"; isEn: boolean }) {
  const tone = riskLevel === "low" ? "trust" : riskLevel === "medium" ? "accent" : "warning";
  const label =
    riskLevel === "low"
      ? isEn
        ? "Low risk"
        : "Risque modéré-faible"
      : riskLevel === "medium"
        ? isEn
          ? "Medium risk"
          : "Risque modéré"
        : isEn
          ? "High variance"
          : "Risque élevé";
  return <UiBadge tone={tone}>{label}</UiBadge>;
}

export function CouponsSection({
  coupons,
  singles,
  guides,
  locale = "fr",
}: {
  coupons: CombinedCouponDto[];
  singles: SingleBetSuggestion[];
  guides: GamingCategoryGuide[];
  locale?: string;
}) {
  const isEn = locale === "en";
  const [tab, setTab] = React.useState<"combos" | "singles" | "games">("combos");

  return (
    <section
      aria-labelledby="ai-coupons-heading"
      className="space-y-4 rounded-3xl border border-border bg-surface-subtle/50 p-4 sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-fg-muted">
            <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            <span>
              {isEn ? "Intelligent Ticket Generator" : "Générateur de Tickets Intelligent"}
            </span>
          </div>
          <h2
            id="ai-coupons-heading"
            className="font-display text-xl font-bold text-fg sm:text-2xl"
          >
            {isEn
              ? "BONUVO AI Selections & Combined Coupons"
              : "Coupons Combinés & Sélections BONUVO AI"}
          </h2>
          <p className="text-xs text-fg-muted sm:text-sm">
            {isEn
              ? "Probabilistic estimates built strictly from real upcoming schedules and season stats — without guaranteed winnings."
              : "Propositions probabilistes construites sur le programme réel et les statistiques à jour — sans garantie de gain."}
          </p>
        </div>

        <div
          className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 sm:pb-0"
          role="tablist"
          aria-label="Modes BONUVO AI"
        >
          <Button
            type="button"
            size="sm"
            role="tab"
            aria-selected={tab === "combos"}
            variant={tab === "combos" ? "primary" : "outline"}
            onClick={() => setTab("combos")}
            className="shrink-0"
          >
            <Layers className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {isEn ? "Combined Coupons" : "Paris combinés"}
          </Button>
          <Button
            type="button"
            size="sm"
            role="tab"
            aria-selected={tab === "singles"}
            variant={tab === "singles" ? "primary" : "outline"}
            onClick={() => setTab("singles")}
            className="shrink-0"
          >
            <Target className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {isEn ? "Single Picks" : "Paris simples"}
          </Button>
          <Button
            type="button"
            size="sm"
            role="tab"
            aria-selected={tab === "games"}
            variant={tab === "games" ? "primary" : "outline"}
            onClick={() => setTab("games")}
            className="shrink-0"
          >
            <ShieldAlert className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {isEn ? "Platform Games" : "Autres jeux"}
          </Button>
        </div>
      </div>

      {tab === "combos" ? (
        coupons.length === 0 ? (
          <Card>
            <CardContent className="pt-5 text-sm text-fg-muted">
              {isEn
                ? "At least 2 eligible upcoming fixtures are required to assemble a combined coupon."
                : "Au moins 2 rencontres analysables à venir sont requises pour assembler un coupon combiné réel."}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {coupons.map((coupon) => (
              <Card
                key={coupon.id}
                className="relative overflow-hidden border-border transition-all duration-300 hover:border-accent/60 hover:shadow-md"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-trust to-accent" />
                <CardHeader className="space-y-2 border-b border-dashed border-border pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="inline-flex items-center gap-1.5 text-base">
                      <Sparkles className="h-4 w-4 text-accent" aria-hidden="true" />
                      {isEn ? coupon.titleEn : coupon.titleFr}
                    </CardTitle>
                    <RiskBadge riskLevel={coupon.riskLevel} isEn={isEn} />
                  </div>
                  <p className="text-xs text-fg-muted">
                    {isEn ? coupon.rationaleEn : coupon.rationaleFr}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  <ul className="space-y-2 text-sm">
                    {coupon.legs.map((leg, idx) => (
                      <li
                        key={`${coupon.id}-${leg.fixtureId}-${leg.marketLabel}`}
                        className="rounded-xl border border-border/70 bg-surface-subtle/70 p-2.5 transition-colors hover:border-border-strong"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Link
                            href={`/pronostics/${leg.fixtureId}`}
                            className="inline-flex min-w-0 items-center gap-1.5 font-semibold text-fg hover:text-accent"
                          >
                            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-surface font-mono text-[11px] font-bold text-fg">
                              {idx + 1}
                            </span>
                            <span className="truncate">{leg.matchLabel}</span>
                            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-fg-muted" />
                          </Link>
                          <span className="shrink-0 rounded-md bg-trust-soft px-2 py-0.5 font-mono text-xs font-bold text-trust">
                            {leg.probabilityPct}%
                          </span>
                        </div>
                        <p className="mt-1 pl-6 text-xs text-fg-muted">
                          {leg.leagueName} · {leg.marketLabel} :{" "}
                          <strong className="text-fg">{leg.selectionLabel}</strong>
                        </p>
                      </li>
                    ))}
                  </ul>

                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border-strong bg-surface-subtle px-3.5 py-2.5 text-xs">
                    <span className="text-fg">
                      {isEn ? "Joint probability" : "Probabilité conjointe estimée"} :{" "}
                      <strong className="font-mono text-sm font-extrabold text-fg">
                        {coupon.combinedProbabilityPct}%
                      </strong>
                    </span>
                    <span className="rounded-md bg-surface px-2 py-0.5 font-mono font-semibold text-fg">
                      {isEn ? "Fair index" : "Indice juste"} ~{coupon.combinedFairOdds}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : null}

      {tab === "singles" ? (
        singles.length === 0 ? (
          <Card>
            <CardContent className="pt-5 text-sm text-fg-muted">
              {isEn
                ? "No single selections computed yet for upcoming fixtures."
                : "Aucune sélection simple disponible tant que les rencontres à venir n'ont pas été synchronisées."}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {singles.slice(0, 6).map((s) => (
              <Card
                key={`${s.predictionId}-${s.marketLabel}`}
                className="transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/60"
              >
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <UiBadge tone="outline">{s.marketLabel}</UiBadge>
                    <RiskBadge riskLevel={s.riskLevel} isEn={isEn} />
                  </div>
                  <Link
                    href={`/pronostics/${s.fixtureId}`}
                    className="block font-display text-sm font-bold text-fg hover:text-accent"
                  >
                    {s.matchLabel}
                  </Link>
                  <div className="flex items-center justify-between rounded-xl bg-trust-soft/60 px-3 py-2">
                    <span className="text-xs font-bold text-trust">{s.selectionLabel}</span>
                    <span className="font-mono text-sm font-extrabold text-trust">
                      {s.probabilityPct}%
                    </span>
                  </div>
                  <p className="line-clamp-3 text-xs leading-relaxed text-fg-muted">
                    {s.rationale}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : null}

      {tab === "games" ? (
        <div className="grid gap-4 md:grid-cols-3">
          {guides.map((g) => (
            <Card key={g.id} className="border-border/90">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{isEn ? g.titleEn : g.titleFr}</CardTitle>
                <p className="text-xs font-semibold text-accent">
                  {isEn ? g.riskProfileEn : g.riskProfileFr}
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-xs leading-relaxed text-fg-muted">
                  {isEn ? g.guidanceEn : g.guidanceFr}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </section>
  );
}
