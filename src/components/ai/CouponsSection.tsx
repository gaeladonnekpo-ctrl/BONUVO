"use client";

import * as React from "react";
import { Layers, ShieldAlert, Sparkles, Target } from "lucide-react";
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
    <section aria-labelledby="ai-coupons-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="ai-coupons-heading" className="font-display text-xl font-bold text-fg">
            {isEn
              ? "BONUVO AI Selections & Combined Coupons"
              : "Coupons Combinés & Sélections BONUVO AI"}
          </h2>
          <p className="text-sm text-fg-muted">
            {isEn
              ? "Probabilistic estimates built strictly from real upcoming schedules and season stats — without guaranteed winnings."
              : "Propositions probabilistes construites sur le programme réel et les statistiques à jour — sans garantie de gain."}
          </p>
        </div>

        <div
          className="flex flex-wrap items-center gap-2"
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
              <Card key={coupon.id}>
                <CardHeader className="space-y-2 pb-3">
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
                <CardContent className="space-y-3">
                  <ul className="divide-y divide-border/70 text-sm">
                    {coupon.legs.map((leg) => (
                      <li key={`${coupon.id}-${leg.fixtureId}-${leg.marketLabel}`} className="py-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Link
                            href={`/pronostics/${leg.fixtureId}`}
                            className="font-medium text-fg hover:text-accent"
                          >
                            {leg.matchLabel}
                          </Link>
                          <span className="font-mono text-xs font-semibold text-trust">
                            {leg.probabilityPct}%
                          </span>
                        </div>
                        <p className="text-xs text-fg-muted">
                          {leg.leagueName} · {leg.marketLabel} :{" "}
                          <strong className="text-fg">{leg.selectionLabel}</strong>
                        </p>
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-subtle px-3 py-2 text-xs">
                    <span className="text-fg-muted">
                      {isEn ? "Joint probability" : "Probabilité conjointe estimée"} :{" "}
                      <strong className="text-fg">{coupon.combinedProbabilityPct}%</strong>
                    </span>
                    <span className="font-mono text-fg-muted">
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
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {singles.slice(0, 6).map((s) => (
              <Card key={`${s.predictionId}-${s.marketLabel}`}>
                <CardContent className="space-y-2.5 pt-5">
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
                  <p className="text-sm font-semibold text-trust">
                    {s.selectionLabel} ({s.probabilityPct}%)
                  </p>
                  <p className="text-xs leading-relaxed text-fg-muted">{s.rationale}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : null}

      {tab === "games" ? (
        <div className="grid gap-4 md:grid-cols-3">
          {guides.map((g) => (
            <Card key={g.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{isEn ? g.titleEn : g.titleFr}</CardTitle>
                <p className="text-xs font-medium text-accent">
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
