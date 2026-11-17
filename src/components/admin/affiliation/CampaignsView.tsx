"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { DataTable, type AdminTableColumn } from "@/components/admin/DataTable";
import { EntityForm } from "@/components/admin/EntityForm";
import { StatusPill } from "@/components/admin/affiliation/StatusPill";
import { Input } from "@/components/ui/input";
import type { AdminActionResult } from "@/lib/admin/action-result";
import { upsertCampaignAction } from "@/modules/affiliation/actions";

export interface CampaignRow {
  id: string;
  code: string;
  name: string;
  source: string;
  medium: string;
  status: string;
  description: string;
}

export function CampaignsView({
  campaigns,
  bookmakers,
  canManage,
}: {
  campaigns: CampaignRow[];
  bookmakers: Array<{ id: string; name: string }>;
  canManage: boolean;
}) {
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [source, setSource] = React.useState("telegram");
  const [medium, setMedium] = React.useState("social");
  const [bookmakerId, setBookmakerId] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [result, setResult] = React.useState<AdminActionResult<unknown> | null>(null);

  const columns: AdminTableColumn<CampaignRow>[] = [
    {
      accessorKey: "code",
      header: "Code UTM",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold">?utm_campaign={row.original.code}</span>
      ),
    },
    { accessorKey: "name", header: "Campagne" },
    {
      accessorKey: "source",
      header: "Source / Support",
      cell: ({ row }) => `${row.original.source} / ${row.original.medium}`,
    },
    {
      accessorKey: "status",
      header: "État",
      cell: ({ row }) => <StatusPill status={row.original.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <DataTable
        data={campaigns}
        columns={columns}
        searchPlaceholder="Filtrer par code ou nom..."
        emptyTitle="Aucune campagne UTM"
        emptyDescription="Créez une campagne pour suivre vos canaux (?utm_campaign=code sur les liens /go/[slug])."
      />

      {canManage ? (
        <EntityForm
          title="Nouvelle campagne UTM"
          description="Utilisable en paramètre ?utm_campaign=<code> ou ?campaign=<code> sur n'importe quel lien /go/[slug]."
          submitLabel="Enregistrer la campagne"
          result={result}
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await upsertCampaignAction({
              code,
              name,
              source,
              medium,
              bookmakerId: bookmakerId || null,
              description,
              status: "active",
            });
            setResult(res);
            if (res.ok) {
              setCode("");
              setName("");
              setDescription("");
              router.refresh();
            }
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="Code UTM (ex. tg-can-2026)"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Input
              placeholder="Nom de campagne"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              placeholder="Source (ex. telegram)"
              required
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
            <Input
              placeholder="Support (ex. social, cpc)"
              required
              value={medium}
              onChange={(e) => setMedium(e.target.value)}
            />
            <select
              aria-label="Bookmaker ciblé"
              value={bookmakerId}
              onChange={(e) => setBookmakerId(e.target.value)}
              className="h-10 rounded-input border border-border bg-surface px-2 text-sm text-fg"
            >
              <option value="">Tous bookmakers</option>
              {bookmakers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <Input
              placeholder="Note / canal"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </EntityForm>
      ) : null}
    </div>
  );
}
