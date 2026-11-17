"use client";

import * as React from "react";
import { DownloadCloud, Play } from "lucide-react";
import { UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toggleLeagueTrackedAction, triggerAiJobAction } from "@/modules/ai/service/actions";

export interface AdminIngestionLeague {
  id: string;
  externalId: string;
  name: string;
  countryName: string;
  priorityOrder: number;
  tracked: boolean;
}

export interface AdminIngestionRun {
  id: string;
  jobName: string;
  status: string;
  requestsMade: number;
  quotaRemaining: number | null;
  itemsUpserted: number;
  errorSummary: string;
  startedAt: string;
}

export function IngestionAdminView({
  providerConfigured,
  llmEnabled,
  dailyQuotaLimit,
  quotaReserve,
  initialLeagues,
  runs,
}: {
  providerConfigured: boolean;
  llmEnabled: boolean;
  dailyQuotaLimit: number;
  quotaReserve: number;
  initialLeagues: AdminIngestionLeague[];
  runs: AdminIngestionRun[];
}) {
  const [leagues, setLeagues] = React.useState(initialLeagues);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function handleToggleLeague(leagueId: string, nextTracked: boolean) {
    setFeedback(null);
    startTransition(async () => {
      const res = await toggleLeagueTrackedAction({ leagueId, tracked: nextTracked });
      if (res.ok) {
        setLeagues((prev) =>
          prev.map((l) => (l.id === leagueId ? { ...l, tracked: nextTracked } : l)),
        );
        setFeedback("Configuration de ligue enregistrée.");
      } else {
        setFeedback(res.error);
      }
    });
  }

  function handleRunJob(jobName: "ingest-fixtures" | "ingest-stats") {
    setFeedback(null);
    startTransition(async () => {
      const res = await triggerAiJobAction({ jobName });
      setFeedback(res.ok ? `Tâche ${jobName} terminée.` : (res.error ?? "Échec de déclenchement."));
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-fg">Ingestion & Ligues suivies</h1>
          <p className="text-sm text-fg-muted">
            Quota fournisseur API-Football ({dailyQuotaLimit} req/j, réserve de sécurité{" "}
            {quotaReserve}).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => handleRunJob("ingest-fixtures")}
          >
            <DownloadCloud className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Ingérer matchs
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => handleRunJob("ingest-stats")}
          >
            <Play className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Ingérer stats
          </Button>
        </div>
      </div>

      {feedback ? (
        <div
          role="status"
          className="rounded-lg border border-border bg-surface-subtle px-4 py-2.5 text-sm text-fg"
        >
          {feedback}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs uppercase text-fg-muted">Clé API-Football</CardTitle>
          </CardHeader>
          <CardContent>
            <UiBadge tone={providerConfigured ? "trust" : "warning"}>
              {providerConfigured ? "Configurée" : "Non configurée (zéro donnée inventée)"}
            </UiBadge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs uppercase text-fg-muted">Ligues suivies</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl font-bold text-fg">
              {leagues.filter((l) => l.tracked).length} / {leagues.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs uppercase text-fg-muted">Rédaction LLM</CardTitle>
          </CardHeader>
          <CardContent>
            <UiBadge tone={llmEnabled ? "accent" : "neutral"}>
              {llmEnabled ? "Activée (vérifiée)" : "Désactivée (modèle déterministe)"}
            </UiBadge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ligues configurées (plan 100 req/jour)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-fg-muted">
                <th className="py-2 pr-3">Compétition</th>
                <th className="py-2 px-3">ID externe</th>
                <th className="py-2 px-3">Priorité</th>
                <th className="py-2 pl-3 text-right">Suivi</th>
              </tr>
            </thead>
            <tbody>
              {leagues.map((l) => (
                <tr key={l.id} className="border-b border-border/60 last:border-b-0">
                  <td className="py-2.5 pr-3 font-medium text-fg">
                    {l.name} <span className="text-xs text-fg-muted">({l.countryName})</span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-xs">{l.externalId}</td>
                  <td className="py-2.5 px-3">{l.priorityOrder}</td>
                  <td className="py-2.5 pl-3 text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant={l.tracked ? "primary" : "outline"}
                      disabled={isPending}
                      onClick={() => handleToggleLeague(l.id, !l.tracked)}
                    >
                      {l.tracked ? "Activée" : "Désactivée"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Journal des exécutions</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {runs.length === 0 ? (
            <p className="py-6 text-center text-sm text-fg-muted">
              Aucune exécution d&apos;ingestion enregistrée pour le moment.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-fg-muted">
                  <th className="py-2 pr-3">Tâche</th>
                  <th className="py-2 px-3">Statut</th>
                  <th className="py-2 px-3">Requêtes</th>
                  <th className="py-2 px-3">Quota restant</th>
                  <th className="py-2 pl-3">Éléments</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-b-0">
                    <td className="py-2.5 pr-3 font-mono text-xs">{r.jobName}</td>
                    <td className="py-2.5 px-3">
                      <UiBadge
                        tone={
                          r.status === "completed"
                            ? "trust"
                            : r.status === "partial_quota_stop"
                              ? "warning"
                              : r.status === "failed"
                                ? "danger"
                                : "neutral"
                        }
                      >
                        {r.status}
                      </UiBadge>
                    </td>
                    <td className="py-2.5 px-3">{r.requestsMade}</td>
                    <td className="py-2.5 px-3">{r.quotaRemaining ?? "—"}</td>
                    <td className="py-2.5 pl-3">{r.itemsUpserted}</td>
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
