"use client";

import { DataTable, type AdminTableColumn } from "@/components/admin/DataTable";
import { StatusPill } from "@/components/admin/affiliation/StatusPill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface ConversionListRow {
  id: string;
  bookmakerName: string;
  conversionType: string;
  attributionMode: string;
  source: string;
  status: string;
  amount: string | null;
  currencyCode: string | null;
  publicClickId: string | null;
  externalEventId: string;
  occurredAtIso: string;
}

export interface NetworkTrackingAvailability {
  name: string;
  trackingMode: string;
}

export function ConversionsView({
  conversions,
  clicksCount,
  networks,
  pendingCommissionsCount,
}: {
  conversions: ConversionListRow[];
  clicksCount: number;
  networks: NetworkTrackingAvailability[];
  pendingCommissionsCount: number;
}) {
  const registrationsCount = conversions.filter((c) => c.conversionType === "registration").length;
  const ftdCount = conversions.filter((c) => c.conversionType === "first_deposit").length;

  const columns: AdminTableColumn<ConversionListRow>[] = [
    { accessorKey: "bookmakerName", header: "Bookmaker" },
    {
      accessorKey: "conversionType",
      header: "Type",
      cell: ({ row }) => <StatusPill status={row.original.conversionType} />,
    },
    {
      accessorKey: "source",
      header: "Source",
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.source}</span>,
    },
    {
      accessorKey: "attributionMode",
      header: "Attribution",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.original.attributionMode}
          {row.original.publicClickId ? ` (${row.original.publicClickId.slice(0, 12)}…)` : ""}
        </span>
      ),
    },
    {
      accessorKey: "amount",
      header: "Montant",
      cell: ({ row }) =>
        row.original.amount !== null
          ? `${row.original.amount} ${row.original.currencyCode ?? ""}`
          : "—",
    },
    {
      accessorKey: "status",
      header: "État",
      cell: ({ row }) => <StatusPill status={row.original.status} />,
    },
    {
      accessorKey: "occurredAtIso",
      header: "Date",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-fg-muted">
          {row.original.occurredAtIso.slice(0, 16).replace("T", " ")}
        </span>
      ),
    },
  ];

  const networksWithoutData = networks.filter((n) => n.trackingMode === "none");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-fg-muted uppercase">
              1. Clics mesurés (BONUVO)
            </CardTitle>
          </CardHeader>
          <CardContent className="font-display text-2xl font-bold text-fg">
            {clicksCount}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-fg-muted uppercase">
              2. Inscriptions déclarées
            </CardTitle>
          </CardHeader>
          <CardContent className="font-display text-2xl font-bold text-fg">
            {registrationsCount}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-fg-muted uppercase">
              3. Premiers dépôts (FTD)
            </CardTitle>
          </CardHeader>
          <CardContent className="font-display text-2xl font-bold text-fg">{ftdCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-fg-muted uppercase">
              4. Commissions en attente
            </CardTitle>
          </CardHeader>
          <CardContent className="font-display text-2xl font-bold text-fg">
            {pendingCommissionsCount}
          </CardContent>
        </Card>
      </div>

      {networksWithoutData.length > 0 ? (
        <div className="rounded-card border border-warning/40 bg-warning-soft p-3 text-xs text-warning">
          Réseaux sans intégration postback ni import configuré :{" "}
          <strong>{networksWithoutData.map((n) => n.name).join(", ")}</strong> — données non
          disponibles (aucune estimation générée).
        </div>
      ) : null}

      <DataTable
        data={conversions}
        columns={columns}
        searchPlaceholder="Filtrer par bookmaker ou identifiant..."
        emptyTitle="Aucune conversion prouvée enregistrée"
        emptyDescription="Aucune ligne sans source : les conversions proviennent uniquement d'un postback vérifié, d'un webhook signé ou d'un import CSV confirmé."
      />
    </div>
  );
}
