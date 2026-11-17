"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { DataTable, type AdminTableColumn } from "@/components/admin/DataTable";
import { UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminActionResult } from "@/lib/admin/action-result";
import {
  bulkUpdateCountriesActiveAction,
  updateCountryConfigAction,
} from "@/modules/offers/actions";

export interface CountryRow {
  id: string;
  code: string;
  nameFr: string;
  nameEn: string;
  currencyCode: string;
  defaultLocale: string;
  active: boolean;
  priorityTier: 1 | 2 | 3;
  continent: string;
}

type CountryFilter = "all" | "priority" | "active" | "inactive";

export function CountriesView({
  countries,
  canWrite,
}: {
  countries: CountryRow[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [filter, setFilter] = React.useState<CountryFilter>("all");
  const [busy, setBusy] = React.useState(false);
  const [feedback, setFeedback] = React.useState<AdminActionResult<unknown> | null>(null);

  const activeCount = countries.filter((c) => c.active).length;
  const priorityCount = countries.filter((c) => c.priorityTier <= 2).length;
  const inactiveCount = countries.length - activeCount;

  const filteredCountries = React.useMemo(() => {
    if (filter === "priority") return countries.filter((c) => c.priorityTier <= 2);
    if (filter === "active") return countries.filter((c) => c.active);
    if (filter === "inactive") return countries.filter((c) => !c.active);
    return countries;
  }, [countries, filter]);

  async function toggleCountry(row: CountryRow) {
    setBusy(true);
    try {
      const res = await updateCountryConfigAction({
        id: row.id,
        currencyCode: row.currencyCode,
        defaultLocale: row.defaultLocale === "en" ? "en" : "fr",
        active: !row.active,
      });
      setFeedback(res);
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function runBulkMode(mode: "all" | "priority_only") {
    setBusy(true);
    try {
      const res = await bulkUpdateCountriesActiveAction(mode);
      setFeedback(res);
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const columns: AdminTableColumn<CountryRow>[] = [
    {
      accessorKey: "code",
      header: "ISO",
      cell: ({ row }) => <span className="font-mono font-bold">{row.original.code}</span>,
    },
    { accessorKey: "nameFr", header: "Pays (FR)" },
    {
      accessorKey: "priorityTier",
      header: "Marché paris sportifs",
      cell: ({ row }) =>
        row.original.priorityTier === 1 ? (
          <UiBadge tone="accent">Top Mondial #1</UiBadge>
        ) : row.original.priorityTier === 2 ? (
          <UiBadge tone="outline">Forte croissance</UiBadge>
        ) : (
          <UiBadge tone="neutral">Standard</UiBadge>
        ),
    },
    { accessorKey: "currencyCode", header: "Devise" },
    { accessorKey: "defaultLocale", header: "Langue" },
    {
      accessorKey: "active",
      header: "Statut",
      cell: ({ row }) => (
        <UiBadge tone={row.original.active ? "trust" : "neutral"}>
          {row.original.active ? "Actif" : "Inactif"}
        </UiBadge>
      ),
    },
    ...(canWrite
      ? [
          {
            id: "toggle",
            header: "Action",
            enableSorting: false,
            cell: ({ row }) => (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => toggleCountry(row.original)}
              >
                {row.original.active ? "Désactiver" : "Activer"}
              </Button>
            ),
          } satisfies AdminTableColumn<CountryRow>,
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { key: "all", label: `Tous ISO 3166 (${countries.length})` },
              { key: "priority", label: `Top Paris Sportifs (${priorityCount})` },
              { key: "active", label: `Actifs (${activeCount})` },
              { key: "inactive", label: `Inactifs (${inactiveCount})` },
            ] as const
          ).map((item) => (
            <Button
              key={item.key}
              type="button"
              size="sm"
              variant={filter === item.key ? "primary" : "outline"}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
            </Button>
          ))}
        </div>

        {canWrite ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => runBulkMode("all")}
            >
              Tout activer ({countries.length})
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => runBulkMode("priority_only")}
            >
              Garder Top Paris Sportifs ({priorityCount})
            </Button>
          </div>
        ) : null}
      </div>

      <p className="text-xs text-fg-muted">
        Couverture mondiale complète : la norme officielle ISO 3166-1 recense {countries.length}{" "}
        pays et territoires souverains ou autonomes. Activez ou désactivez librement chaque pays
        pour contrôler sa visibilité publique et ses devises associées.
      </p>

      {feedback ? (
        <div
          role="status"
          className={
            feedback.ok
              ? "rounded-lg border border-success/40 bg-success-soft px-3 py-2 text-sm text-fg"
              : "rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger"
          }
        >
          {feedback.message}
        </div>
      ) : null}

      <DataTable
        data={filteredCountries}
        columns={columns}
        pageSize={25}
        searchPlaceholder="Rechercher un pays ISO 3166 (ex. NG, KE, GH, BJ, XOF)..."
        emptyTitle="Aucun pays dans ce filtre"
        emptyDescription="Ajustez le filtre ou exécutez npm run db:seed pour charger les 249 pays ISO 3166."
      />
    </div>
  );
}
