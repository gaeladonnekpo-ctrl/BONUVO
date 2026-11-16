"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { DataTable, type AdminTableColumn } from "@/components/admin/DataTable";
import { UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminActionResult } from "@/lib/admin/action-result";
import { updateCountryConfigAction } from "@/modules/offers/actions";

export interface CountryRow {
  id: string;
  code: string;
  nameFr: string;
  nameEn: string;
  currencyCode: string;
  defaultLocale: string;
  active: boolean;
}

export function CountriesView({
  countries,
  canWrite,
}: {
  countries: CountryRow[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [feedback, setFeedback] = React.useState<AdminActionResult<unknown> | null>(null);

  async function toggleCountry(row: CountryRow) {
    const res = await updateCountryConfigAction({
      id: row.id,
      currencyCode: row.currencyCode,
      defaultLocale: row.defaultLocale === "en" ? "en" : "fr",
      active: !row.active,
    });
    setFeedback(res);
    if (res.ok) router.refresh();
  }

  const columns: AdminTableColumn<CountryRow>[] = [
    {
      accessorKey: "code",
      header: "ISO",
      cell: ({ row }) => <span className="font-mono font-bold">{row.original.code}</span>,
    },
    { accessorKey: "nameFr", header: "Pays (FR)" },
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
        data={countries}
        columns={columns}
        pageSize={25}
        searchPlaceholder="Rechercher un pays ISO 3166 (ex. BJ, Sénégal, XOF)..."
        emptyTitle="Aucun pays référencé"
        emptyDescription="Exécutez npm run db:seed pour charger le référentiel ISO 3166."
      />
    </div>
  );
}
