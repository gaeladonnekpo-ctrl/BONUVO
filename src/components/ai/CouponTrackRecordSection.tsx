"use client";

import * as React from "react";
import { ArrowUpRight, CheckCircle2, Clock, Layers, Trophy, XCircle } from "lucide-react";
import { UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type {
  PublicCouponTrackItem,
  PublicCouponTrackRecord,
} from "@/modules/ai/service/public-coupon-history";

type StatusFilter = "all" | "won" | "pending" | "lost" | "void";

function StatusBadge({
  status,
  isEn,
}: {
  status: PublicCouponTrackItem["settlementStatus"];
  isEn: boolean;
}) {
  if (status === "won") {
    return (
      <UiBadge tone="trust" className="gap-1">
        <Trophy className="h-3 w-3" aria-hidden="true" />
        {isEn ? "Won" : "Gagnant"}
      </UiBadge>
    );
  }
  if (status === "lost") {
    return (
      <UiBadge tone="danger" className="gap-1">
        <XCircle className="h-3 w-3" aria-hidden="true" />
        {isEn ? "Lost" : "Perdu"}
      </UiBadge>
    );
  }
  if (status === "void") {
    return <UiBadge tone="outline">{isEn ? "Void / Cancelled" : "Annulé / Neutre"}</UiBadge>;
  }
  return (
    <UiBadge tone="accent" className="gap-1">
      <Clock className="h-3 w-3" aria-hidden="true" />
      {isEn ? "Pending" : "En cours"}
    </UiBadge>
  );
}

export function CouponTrackRecordSection({
  record,
  locale = "fr",
}: {
  record: PublicCouponTrackRecord;
  locale?: string;
}) {
  const isEn = locale === "en";
  const { summary, coupons } = record;
  const [filter, setFilter] = React.useState<StatusFilter>(summary.wonCount > 0 ? "won" : "all");

  const visibleCoupons =
    filter === "all" ? coupons : coupons.filter((c) => c.settlementStatus === filter);

  const filterTabs: Array<{ id: StatusFilter; label: string; count: number }> = [
    { id: "won", label: isEn ? "Winning" : "Gagnants", count: summary.wonCount },
    { id: "all", label: isEn ? "All" : "Tous", count: summary.totalCoupons },
    { id: "pending", label: isEn ? "Pending" : "En cours", count: summary.pendingCount },
    { id: "lost", label: isEn ? "Lost" : "Perdus", count: summary.lostCount },
    { id: "void", label: isEn ? "Void" : "Annulés", count: summary.voidCount },
  ];

  return (
    <section aria-labelledby="coupon-track-record-heading" className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{isEn ? "Verified Coupon Ledger" : "Registre vérifié des coupons"}</span>
          </div>
          <h2 id="coupon-track-record-heading" className="font-display text-xl font-bold text-fg">
            {isEn
              ? "Combined Coupons Track Record & Winning Slips"
              : "Bilan des Coupons Combinés & Tickets Gagnants"}
          </h2>
          <p className="max-w-2xl text-xs text-fg-muted sm:text-sm">
            {isEn
              ? "Every combined coupon is locked before kickoff and automatically settled once official match scores are confirmed. Past hit rates never guarantee future results."
              : "Chaque coupon combiné est verrouillé avant le coup d'envoi puis réglé automatiquement dès confirmation des scores officiels. Aucun taux passé ne garantit de gains futurs."}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filtre coupons">
          {filterTabs.map((t) => (
            <Button
              key={t.id}
              type="button"
              size="sm"
              role="tab"
              aria-selected={filter === t.id}
              variant={filter === t.id ? "primary" : "outline"}
              onClick={() => setFilter(t.id)}
              className="h-8 rounded-full px-3 text-xs"
            >
              {t.label} ({t.count})
            </Button>
          ))}
        </div>
      </div>

      {/* 4 Coupon KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-[11px] uppercase text-fg-muted">
              {isEn ? "Winning coupons" : "Coupons gagnants"}
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-trust">{summary.wonCount}</p>
            <p className="text-[11px] text-fg-muted">
              {summary.settledCount} {isEn ? "settled total" : "réglés au total"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-[11px] uppercase text-fg-muted">
              {isEn ? "Coupon win rate" : "Réussite coupons"}
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-fg">
              {summary.winRatePct !== null ? `${summary.winRatePct}%` : "—"}
            </p>
            <p className="text-[11px] text-fg-muted">
              {summary.wonCount} {isEn ? "won" : "gagnés"} · {summary.lostCount}{" "}
              {isEn ? "lost" : "perdus"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-[11px] uppercase text-fg-muted">
              {isEn ? "Avg. winning odds" : "Cote moyenne gagnante"}
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-fg">
              {summary.avgWinningOdds !== null ? `${summary.avgWinningOdds}x` : "—"}
            </p>
            <p className="text-[11px] text-fg-muted">
              {isEn ? "Settled winning slips" : "Sur tickets gagnants"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-[11px] uppercase text-fg-muted">
              {isEn ? "Pending / Void" : "En cours / Annulés"}
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-fg">
              {summary.pendingCount} / {summary.voidCount}
            </p>
            <p className="text-[11px] text-fg-muted">
              {isEn ? "Auto-updated after FT" : "Mise à jour auto après score"}
            </p>
          </CardContent>
        </Card>
      </div>

      {visibleCoupons.length === 0 ? (
        <Card>
          <CardContent className="pt-5 text-sm text-fg-muted">
            {isEn
              ? "No coupons match this status filter yet."
              : "Aucun coupon ne correspond à ce filtre pour le moment."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visibleCoupons.map((cp) => (
            <Card key={cp.id} className="flex flex-col justify-between">
              <CardHeader className="space-y-2 border-b border-dashed border-border pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={cp.settlementStatus} isEn={isEn} />
                    <UiBadge tone="outline">
                      {cp.source === "bonuvo_ai" ? "BONUVO AI" : isEn ? "Community" : "Communauté"}
                    </UiBadge>
                  </div>
                  {cp.combinedOdds ? (
                    <span className="rounded-lg bg-surface-subtle px-2.5 py-1 font-mono text-xs font-bold text-fg">
                      {isEn ? "Odds" : "Cote"} {cp.combinedOdds.toFixed(2)}
                    </span>
                  ) : null}
                </div>
                <CardTitle className="text-base">{isEn ? cp.titleEn : cp.titleFr}</CardTitle>
                {(isEn ? cp.descriptionEn : cp.descriptionFr) ? (
                  <p className="text-xs leading-relaxed text-fg-muted">
                    {isEn ? cp.descriptionEn : cp.descriptionFr}
                  </p>
                ) : null}
              </CardHeader>

              <CardContent className="space-y-2.5 pt-4">
                {cp.legs.length === 0 ? (
                  <p className="text-xs text-fg-muted">
                    {isEn
                      ? "Editorial coupon without linked match legs."
                      : "Coupon éditorial sans sélections individuelles liées."}
                  </p>
                ) : (
                  cp.legs.map((leg, idx) => (
                    <div
                      key={`${cp.id}-${leg.fixtureId}-${idx}`}
                      className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface-subtle/60 px-3 py-2 text-xs"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-[10px] font-medium text-fg-muted">{leg.leagueName}</p>
                        <Link
                          href={`/pronostics/${leg.fixtureId}`}
                          className="inline-flex items-center gap-1 font-semibold text-fg hover:text-accent hover:underline"
                        >
                          <span className="truncate">{leg.matchLabel}</span>
                          <ArrowUpRight className="h-3 w-3 shrink-0" aria-hidden="true" />
                        </Link>
                        <p className="text-[11px] font-medium text-accent">
                          {leg.marketLabel} · {leg.selectionLabel}
                        </p>
                      </div>

                      <div className="shrink-0 text-right space-y-0.5">
                        {leg.homeGoals !== null && leg.awayGoals !== null ? (
                          <p className="font-mono text-xs font-bold text-fg">
                            {leg.homeGoals} - {leg.awayGoals}
                          </p>
                        ) : (
                          <p className="font-mono text-[11px] text-fg-muted">—</p>
                        )}
                        <span
                          className={
                            leg.verdict === "won"
                              ? "inline-flex items-center gap-1 font-semibold text-trust"
                              : leg.verdict === "lost"
                                ? "inline-flex items-center gap-1 font-semibold text-danger"
                                : "text-fg-muted"
                          }
                        >
                          {leg.verdict === "won" ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                              {isEn ? "Won" : "Validé"}
                            </>
                          ) : leg.verdict === "lost" ? (
                            <>
                              <XCircle className="h-3 w-3" aria-hidden="true" />
                              {isEn ? "Lost" : "Manqué"}
                            </>
                          ) : leg.verdict === "void" ? (
                            isEn ? (
                              "Void"
                            ) : (
                              "Annulé"
                            )
                          ) : isEn ? (
                            "Pending"
                          ) : (
                            "En attente"
                          )}
                        </span>
                      </div>
                    </div>
                  ))
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-fg-muted">
                  <span>
                    {cp.validatedAt
                      ? `${isEn ? "Locked" : "Verrouillé"} : ${new Date(cp.validatedAt).toLocaleDateString(isEn ? "en-US" : "fr-FR")}`
                      : ""}
                  </span>
                  <span>
                    {cp.settledAt
                      ? `${isEn ? "Settled" : "Réglé"} : ${new Date(cp.settledAt).toLocaleDateString(isEn ? "en-US" : "fr-FR")}`
                      : isEn
                        ? "Awaiting final whistle"
                        : "En attente du coup de sifflet final"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
