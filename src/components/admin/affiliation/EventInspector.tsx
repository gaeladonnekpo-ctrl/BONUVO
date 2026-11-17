"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { DataTable, type AdminTableColumn } from "@/components/admin/DataTable";
import { StatusPill } from "@/components/admin/affiliation/StatusPill";
import { Button } from "@/components/ui/button";
import { replayPostbackEventAction } from "@/modules/affiliation/actions";

export interface PostbackEventRow {
  id: string;
  networkSlug: string;
  sourceType: string;
  externalEventId: string;
  signatureValid: boolean;
  processingStatus: string;
  rejectionReason: string;
  rawQuery: Record<string, string>;
  rawBody: string;
  createdAtIso: string;
}

export function EventInspector({
  events,
  canReplay,
}: {
  events: PostbackEventRow[];
  canReplay: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<PostbackEventRow | null>(events[0] ?? null);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  async function handleReplay(eventId: string) {
    setBusyId(eventId);
    setFeedback(null);
    const res = await replayPostbackEventAction({ postbackEventId: eventId });
    setBusyId(null);
    setFeedback(res.message);
    if (res.ok) router.refresh();
  }

  const columns: AdminTableColumn<PostbackEventRow>[] = [
    { accessorKey: "networkSlug", header: "Réseau" },
    {
      accessorKey: "sourceType",
      header: "Canal",
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.sourceType}</span>,
    },
    {
      accessorKey: "externalEventId",
      header: "ID externe",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.externalEventId || "—"}</span>
      ),
    },
    {
      accessorKey: "signatureValid",
      header: "Signature",
      cell: ({ row }) => (
        <StatusPill
          status={row.original.signatureValid ? "confirmed" : "rejected"}
          label={row.original.signatureValid ? "Valide" : "Invalide"}
        />
      ),
    },
    {
      accessorKey: "processingStatus",
      header: "Traitement",
      cell: ({ row }) => <StatusPill status={row.original.processingStatus} />,
    },
    {
      id: "inspect",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setSelected(row.original)}
          >
            Inspecter
          </Button>
          {canReplay && row.original.signatureValid ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busyId === row.original.id}
              onClick={() => void handleReplay(row.original.id)}
            >
              Rejouer
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {feedback ? (
        <p className="rounded-lg border border-border bg-surface-subtle px-3 py-2 text-xs font-medium text-fg">
          {feedback}
        </p>
      ) : null}

      <DataTable
        data={events}
        columns={columns}
        searchPlaceholder="Rechercher par réseau ou identifiant..."
        emptyTitle="Aucun postback brut reçu"
        emptyDescription="Les requêtes reçues sur /api/postbacks/[network] et /api/webhooks/[provider] apparaîtront ici."
      />

      {selected ? (
        <section className="space-y-3 rounded-card border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-base font-bold text-fg">
              Inspecteur d&apos;événement brut — {selected.networkSlug}
            </h2>
            <span className="font-mono text-xs text-fg-muted">{selected.createdAtIso}</span>
          </div>
          {selected.rejectionReason ? (
            <p className="text-xs font-medium text-danger">Motif : {selected.rejectionReason}</p>
          ) : null}
          <pre className="max-h-72 overflow-auto rounded-lg border border-border bg-surface-subtle p-3 font-mono text-xs text-fg">
            {JSON.stringify(
              {
                query: selected.rawQuery,
                body: selected.rawBody || null,
              },
              null,
              2,
            )}
          </pre>
        </section>
      ) : null}
    </div>
  );
}
