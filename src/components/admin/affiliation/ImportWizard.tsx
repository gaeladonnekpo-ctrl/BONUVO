"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { DataTable, type AdminTableColumn } from "@/components/admin/DataTable";
import { StatusPill } from "@/components/admin/affiliation/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  commitConversionImportAction,
  previewConversionImportAction,
} from "@/modules/affiliation/actions";

export interface ImportHistoryRow {
  id: string;
  filename: string;
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  status: string;
  createdAtIso: string;
}

interface PreviewSummary {
  totalRows: number;
  acceptedCount: number;
  rejectedCount: number;
  duplicateCount: number;
  rejections: Array<{ row: number; reason: string }>;
}

export function ImportWizard({
  imports,
  networks,
  canImport,
}: {
  imports: ImportHistoryRow[];
  networks: Array<{ id: string; name: string }>;
  canImport: boolean;
}) {
  const router = useRouter();
  const [filename, setFilename] = React.useState("rapport-partenaire.csv");
  const [networkId, setNetworkId] = React.useState("");
  const [csvText, setCsvText] = React.useState("");
  const [preview, setPreview] = React.useState<PreviewSummary | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    setCsvText(await file.text());
    setPreview(null);
  }

  async function handlePreview() {
    setBusy(true);
    setMessage(null);
    const res = await previewConversionImportAction({
      filename,
      networkId: networkId || null,
      csvText,
    });
    setBusy(false);
    setMessage(res.message);
    if (res.ok && res.data) setPreview(res.data);
  }

  async function handleCommit() {
    setBusy(true);
    setMessage(null);
    const res = await commitConversionImportAction({
      filename,
      networkId: networkId || null,
      csvText,
    });
    setBusy(false);
    setMessage(res.message);
    if (res.ok) {
      setPreview(null);
      setCsvText("");
      router.refresh();
    }
  }

  const columns: AdminTableColumn<ImportHistoryRow>[] = [
    { accessorKey: "filename", header: "Fichier" },
    { accessorKey: "totalRows", header: "Lignes lues" },
    { accessorKey: "acceptedRows", header: "Acceptées" },
    { accessorKey: "rejectedRows", header: "Rejetées" },
    {
      accessorKey: "status",
      header: "État",
      cell: ({ row }) => <StatusPill status={row.original.status} />,
    },
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
      {canImport ? (
        <section className="space-y-4 rounded-card border border-border bg-surface p-5">
          <h2 className="font-display text-base font-bold text-fg">
            Assistant d&apos;import CSV (aperçu puis confirmation)
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              type="file"
              accept=".csv,text/csv"
              aria-label="Fichier CSV partenaire"
              onChange={(e) => void handleFileSelect(e)}
            />
            <Input
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="Nom du fichier"
            />
            <select
              aria-label="Réseau d'affiliation"
              value={networkId}
              onChange={(e) => setNetworkId(e.target.value)}
              className="h-10 rounded-input border border-border bg-surface px-2 text-sm text-fg"
            >
              <option value="">Sans réseau dédié</option>
              {networks.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </div>
          <textarea
            rows={5}
            value={csvText}
            onChange={(e) => {
              setCsvText(e.target.value);
              setPreview(null);
            }}
            placeholder="external_event_id,bookmaker_slug,conversion_type,occurred_at,amount,currency,click_id,promo_code,commission_model,commission_amount,period_label,proof_reference"
            className="w-full rounded-input border border-border bg-surface-subtle p-3 font-mono text-xs text-fg"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy || !csvText.trim()}
              onClick={() => void handlePreview()}
            >
              Prévisualiser et valider
            </Button>
            {preview ? (
              <Button
                type="button"
                variant="primary"
                disabled={busy || preview.acceptedCount === 0}
                onClick={() => void handleCommit()}
              >
                Confirmer l&apos;import ({preview.acceptedCount} lignes)
              </Button>
            ) : null}
          </div>

          {message ? (
            <p className="rounded-lg border border-border bg-surface-subtle px-3 py-2 text-xs text-fg">
              {message}
            </p>
          ) : null}

          {preview ? (
            <div className="space-y-2 rounded-lg border border-border bg-surface-subtle p-3 text-xs">
              <p className="font-semibold text-fg">
                Total : {preview.totalRows} · Valides : {preview.acceptedCount} · Rejets :{" "}
                {preview.rejectedCount} (dont {preview.duplicateCount} doublons)
              </p>
              {preview.rejections.length > 0 ? (
                <ul className="max-h-40 space-y-1 overflow-auto font-mono text-danger">
                  {preview.rejections.map((r, i) => (
                    <li key={`${r.row}-${i}`}>
                      Ligne {r.row} : {r.reason}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      <DataTable
        data={imports}
        columns={columns}
        searchPlaceholder="Filtrer les imports..."
        emptyTitle="Aucun import CSV enregistré"
        emptyDescription="Importez un rapport partenaire pour rattacher des conversions et commissions par période."
      />
    </div>
  );
}
