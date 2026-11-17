"use client";

import * as React from "react";
import { CheckCircle2, Lock, Play, RefreshCw } from "lucide-react";
import { UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { triggerAiJobAction, validatePredictionCouponAction } from "@/modules/ai/service/actions";

export interface AdminPredictionItem {
  id: string;
  fixtureId: string;
  leagueName: string;
  matchLabel: string;
  kickoffAt: string;
  fixtureStatus: string;
  market: string;
  pickedSelection: string;
  confidenceLevel: "low" | "medium" | "high";
  confidenceScore: number;
  couponValidated: boolean;
  lockedAt: string | null;
  verdict: string | null;
  brierScore: number | null;
}

export function PredictionsAdminView({ initialItems }: { initialItems: AdminPredictionItem[] }) {
  const [items, setItems] = React.useState(initialItems);
  const [statusMsg, setStatusMsg] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function handleTrigger(jobName: "compute-predictions" | "settle-predictions") {
    setStatusMsg(null);
    startTransition(async () => {
      const res = await triggerAiJobAction({ jobName });
      setStatusMsg(
        res.ok ? `Tâche ${jobName} exécutée.` : (res.error ?? "Erreur lors de l'exécution."),
      );
    });
  }

  function handleValidateCoupon(predictionId: string) {
    setStatusMsg(null);
    startTransition(async () => {
      const res = await validatePredictionCouponAction({ predictionId });
      if (res.ok) {
        setItems((prev) =>
          prev.map((row) => (row.id === predictionId ? { ...row, couponValidated: true } : row)),
        );
        setStatusMsg("Coupon validé et journalisé.");
      } else {
        setStatusMsg(res.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-fg">Pronostics IA (Poisson v1.0)</h1>
          <p className="text-sm text-fg-muted">
            Validation humaine avant coup d&apos;envoi et suivi d&apos;immutabilité en base.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => handleTrigger("compute-predictions")}
          >
            <Play className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Calculer Poisson
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => handleTrigger("settle-predictions")}
          >
            <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Régler résultats
          </Button>
        </div>
      </div>

      {statusMsg ? (
        <div
          role="status"
          className="rounded-lg border border-border bg-surface-subtle px-4 py-2.5 text-sm text-fg"
        >
          {statusMsg}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium uppercase text-fg-muted">
              Pronostics générés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl font-bold text-fg">{items.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium uppercase text-fg-muted">
              Coupons validés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl font-bold text-trust">
              {items.filter((i) => i.couponValidated).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium uppercase text-fg-muted">
              Verdicts réglés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl font-bold text-fg">
              {items.filter((i) => i.verdict !== null).length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">File des pronostics récents</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-fg-muted">
              Aucun pronostic généré pour le moment. Configurez <code>API_FOOTBALL_KEY</code> et
              lancez l&apos;ingestion depuis l&apos;onglet Ingestion & Ligues.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-fg-muted">
                  <th className="py-2 pr-3">Match</th>
                  <th className="py-2 px-3">Marché</th>
                  <th className="py-2 px-3">Sélection</th>
                  <th className="py-2 px-3">Confiance</th>
                  <th className="py-2 px-3">Statut</th>
                  <th className="py-2 pl-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b border-border/60 last:border-b-0">
                    <td className="py-2.5 pr-3">
                      <p className="font-medium text-fg">{row.matchLabel}</p>
                      <p className="text-xs text-fg-muted">
                        {row.leagueName} · {row.kickoffAt.slice(0, 16).replace("T", " ")}
                      </p>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-xs">{row.market}</td>
                    <td className="py-2.5 px-3 font-semibold">{row.pickedSelection}</td>
                    <td className="py-2.5 px-3">
                      <UiBadge
                        tone={
                          row.confidenceLevel === "high"
                            ? "trust"
                            : row.confidenceLevel === "medium"
                              ? "accent"
                              : "neutral"
                        }
                      >
                        {row.confidenceLevel} ({Math.round(row.confidenceScore * 100)}%)
                      </UiBadge>
                    </td>
                    <td className="py-2.5 px-3">
                      {row.verdict ? (
                        <UiBadge
                          tone={
                            row.verdict === "won"
                              ? "trust"
                              : row.verdict === "lost"
                                ? "danger"
                                : "neutral"
                          }
                        >
                          {row.verdict}
                        </UiBadge>
                      ) : row.lockedAt ? (
                        <span className="inline-flex items-center gap-1 text-xs text-fg-muted">
                          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                          Verrouillé
                        </span>
                      ) : (
                        <span className="text-xs text-fg-muted">Ouvert</span>
                      )}
                    </td>
                    <td className="py-2.5 pl-3 text-right">
                      {row.couponValidated ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-trust">
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          Validé
                        </span>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => handleValidateCoupon(row.id)}
                        >
                          Valider coupon
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
