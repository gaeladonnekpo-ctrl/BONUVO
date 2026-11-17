"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { DataTable, type AdminTableColumn } from "@/components/admin/DataTable";
import { EntityForm } from "@/components/admin/EntityForm";
import { StatusPill } from "@/components/admin/affiliation/StatusPill";
import { Input } from "@/components/ui/input";
import type { AdminActionResult } from "@/lib/admin/action-result";
import { setCommissionStatusAction } from "@/modules/affiliation/actions";

export interface CommissionListRow {
  id: string;
  bookmakerName: string;
  model: string;
  amount: string;
  currencyCode: string;
  status: string;
  periodLabel: string;
  proofReference: string;
}

export interface CommissionHistoryRow {
  id: string;
  commissionId: string;
  previousStatus: string | null;
  nextStatus: string;
  proofReference: string;
  reason: string;
  createdAtIso: string;
}

export function CommissionsView({
  commissions,
  history,
  canManage,
}: {
  commissions: CommissionListRow[];
  history: CommissionHistoryRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [commissionId, setCommissionId] = React.useState(commissions[0]?.id ?? "");
  const [nextStatus, setNextStatus] = React.useState<"pending" | "confirmed" | "rejected" | "paid">(
    "confirmed",
  );
  const [proofReference, setProofReference] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [result, setResult] = React.useState<AdminActionResult<unknown> | null>(null);

  const columns: AdminTableColumn<CommissionListRow>[] = [
    { accessorKey: "bookmakerName", header: "Bookmaker" },
    {
      accessorKey: "model",
      header: "Modèle",
      cell: ({ row }) => <span className="uppercase">{row.original.model}</span>,
    },
    {
      accessorKey: "amount",
      header: "Montant",
      cell: ({ row }) => (
        <span className="font-mono font-semibold">
          {row.original.amount} {row.original.currencyCode}
        </span>
      ),
    },
    { accessorKey: "periodLabel", header: "Période" },
    {
      accessorKey: "proofReference",
      header: "Référence preuve",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.proofReference || "—"}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Statut",
      cell: ({ row }) => <StatusPill status={row.original.status} />,
    },
  ];

  const historyColumns: AdminTableColumn<CommissionHistoryRow>[] = [
    {
      accessorKey: "commissionId",
      header: "Commission",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.commissionId.slice(0, 8)}…</span>
      ),
    },
    {
      accessorKey: "previousStatus",
      header: "Transition",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <StatusPill status={row.original.previousStatus ?? "pending"} />
          <span className="text-xs text-fg-muted">→</span>
          <StatusPill status={row.original.nextStatus} />
        </div>
      ),
    },
    { accessorKey: "proofReference", header: "Justificatif" },
    { accessorKey: "reason", header: "Note" },
    {
      accessorKey: "createdAtIso",
      header: "Date",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-fg-muted">
          {row.original.createdAtIso.slice(0, 16).replace("T", " ")}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <DataTable
        data={commissions}
        columns={columns}
        searchPlaceholder="Rechercher par bookmaker ou période..."
        emptyTitle="Aucune commission enregistrée"
        emptyDescription="Les commissions sont créées à réception d'un postback ou lors d'un import CSV confirmé."
      />

      {canManage && commissions.length > 0 ? (
        <EntityForm
          title="Transition de statut de commission"
          description="Une commission ne peut passer à confirmed qu'avec une référence justificative partenaire."
          submitLabel="Appliquer la transition"
          result={result}
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await setCommissionStatusAction({
              commissionId,
              nextStatus,
              proofReference,
              reason,
            });
            setResult(res);
            if (res.ok) {
              setProofReference("");
              setReason("");
              router.refresh();
            }
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              aria-label="Commission ciblée"
              value={commissionId}
              onChange={(e) => setCommissionId(e.target.value)}
              className="h-10 rounded-input border border-border bg-surface px-2 text-sm text-fg"
            >
              {commissions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.bookmakerName} · {c.amount} {c.currencyCode} ({c.status})
                </option>
              ))}
            </select>
            <select
              aria-label="Nouveau statut"
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value as typeof nextStatus)}
              className="h-10 rounded-input border border-border bg-surface px-2 text-sm text-fg"
            >
              <option value="pending">pending</option>
              <option value="confirmed">confirmed (justificatif requis)</option>
              <option value="paid">paid</option>
              <option value="rejected">rejected</option>
            </select>
            <Input
              placeholder="Référence preuve / facture (obligatoire pour confirmed)"
              value={proofReference}
              onChange={(e) => setProofReference(e.target.value)}
            />
            <Input
              placeholder="Motif / commentaire"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </EntityForm>
      ) : null}

      <div className="space-y-2">
        <h2 className="font-display text-base font-bold text-fg">
          Historique immuable des transitions ({history.length})
        </h2>
        <DataTable
          data={history}
          columns={historyColumns}
          searchPlaceholder="Filtrer l'historique..."
          emptyTitle="Aucune transition enregistrée"
          emptyDescription="Chaque changement de statut est conservé ici et dans le journal d'audit."
        />
      </div>
    </div>
  );
}
