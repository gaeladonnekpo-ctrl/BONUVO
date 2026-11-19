"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { DataTable, type AdminTableColumn } from "@/components/admin/DataTable";
import { EntityForm } from "@/components/admin/EntityForm";
import { UiBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { AdminActionResult } from "@/lib/admin/action-result";
import { upsertPromoCodeAction } from "@/modules/offers/actions";

export interface PromoCodeRow {
  id: string;
  code: string;
  description: string;
  programSource?: string;
  bookmakerName: string;
  offerTitleFr: string | null;
  countryCode: string | null;
  status: string;
}

export function PromoCodesView({
  codes,
  bookmakers,
  offers,
  countries,
  canWrite,
}: {
  codes: PromoCodeRow[];
  bookmakers: Array<{ id: string; name: string }>;
  offers: Array<{ id: string; titleFr: string }>;
  countries: Array<{ id: string; code: string; nameFr: string }>;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [bookmakerId, setBookmakerId] = React.useState(bookmakers[0]?.id ?? "");
  const [offerId, setOfferId] = React.useState("");
  const [countryId, setCountryId] = React.useState("");
  const [code, setCode] = React.useState("");
  const [programSource, setProgramSource] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [result, setResult] = React.useState<AdminActionResult<unknown> | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await upsertPromoCodeAction({
      bookmakerId,
      offerId: offerId || null,
      countryId: countryId || null,
      code,
      programSource,
      description,
      status: "active",
    });
    setResult(res);
    if (res.ok) {
      setCode("");
      setProgramSource("");
      setDescription("");
      router.refresh();
    }
  }

  const columns: AdminTableColumn<PromoCodeRow>[] = [
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => <span className="font-mono font-bold text-fg">{row.original.code}</span>,
    },
    { accessorKey: "bookmakerName", header: "Bookmaker" },
    {
      accessorKey: "programSource",
      header: "Programme d'affiliation",
      cell: ({ row }) => (
        <span className="text-xs font-medium text-fg">{row.original.programSource || "—"}</span>
      ),
    },
    {
      accessorKey: "offerTitleFr",
      header: "Offre liée",
      cell: ({ row }) => (
        <span className="text-xs text-fg-muted">{row.original.offerTitleFr ?? "Toutes"}</span>
      ),
    },
    {
      accessorKey: "countryCode",
      header: "Pays",
      cell: ({ row }) => (
        <span className="text-xs text-fg-muted">{row.original.countryCode ?? "Tous"}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Statut",
      cell: ({ row }) => (
        <UiBadge tone={row.original.status === "active" ? "trust" : "neutral"}>
          {row.original.status}
        </UiBadge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <DataTable
        data={codes}
        columns={columns}
        searchPlaceholder="Rechercher un code promo..."
        emptyTitle="Aucun code promo"
        emptyDescription="Ajoutez un code promo rattaché à un bookmaker ci-dessous."
      />

      {canWrite && bookmakers.length > 0 ? (
        <EntityForm
          title="Nouveau code promo"
          submitLabel="Enregistrer le code"
          result={result}
          onSubmit={handleSubmit}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="pc-bm" className="text-xs font-semibold text-fg">
                Bookmaker *
              </label>
              <select
                id="pc-bm"
                value={bookmakerId}
                onChange={(e) => setBookmakerId(e.target.value)}
                className="h-10 w-full rounded-input border border-border bg-surface px-3 text-sm text-fg"
              >
                {bookmakers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="pc-code" className="text-xs font-semibold text-fg">
                Code *
              </label>
              <Input
                id="pc-code"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="BONUVO100"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="pc-offer" className="text-xs font-semibold text-fg">
                Offre liée
              </label>
              <select
                id="pc-offer"
                value={offerId}
                onChange={(e) => setOfferId(e.target.value)}
                className="h-10 w-full rounded-input border border-border bg-surface px-3 text-sm text-fg"
              >
                <option value="">Aucune offre spécifique</option>
                {offers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.titleFr}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="pc-country" className="text-xs font-semibold text-fg">
                Pays ciblé
              </label>
              <select
                id="pc-country"
                value={countryId}
                onChange={(e) => setCountryId(e.target.value)}
                className="h-10 w-full rounded-input border border-border bg-surface px-3 text-sm text-fg"
              >
                <option value="">Tous les pays éligibles</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} · {c.nameFr}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="pc-program" className="text-xs font-semibold text-fg">
                Programme d&apos;affiliation source
              </label>
              <Input
                id="pc-program"
                placeholder="ex. 1xPartners, Melbet Affiliates"
                value={programSource}
                onChange={(e) => setProgramSource(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="pc-desc" className="text-xs font-semibold text-fg">
                Description
              </label>
              <Input
                id="pc-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        </EntityForm>
      ) : null}
    </div>
  );
}
