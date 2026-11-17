"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { DataTable, type AdminTableColumn } from "@/components/admin/DataTable";
import { EntityForm } from "@/components/admin/EntityForm";
import { NetworkFormSection } from "@/components/admin/affiliation/NetworkFormSection";
import { UiBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { AdminActionResult } from "@/lib/admin/action-result";
import { upsertAffiliateLinkAction } from "@/modules/offers/actions";

export interface AffiliateNetworkRow {
  id: string;
  name: string;
  trackingMode: string;
  subIdParamName: string;
  secretEnvRef: string;
  status: string;
}

export interface AffiliateLinkRow {
  id: string;
  slug: string;
  bookmakerName: string;
  countryCode: string | null;
  destinationUrl: string;
  allowedHost: string;
  active: boolean;
  status: string;
}

export function AffiliationView({
  networks,
  links,
  bookmakers,
  countries,
  offers,
  canManageLinks,
}: {
  networks: AffiliateNetworkRow[];
  links: AffiliateLinkRow[];
  bookmakers: Array<{ id: string; name: string; allowedHosts: string[] }>;
  countries: Array<{ id: string; code: string; nameFr: string }>;
  offers: Array<{ id: string; titleFr: string }>;
  canManageLinks: boolean;
}) {
  const router = useRouter();
  const [slug, setSlug] = React.useState("");
  const [bookmakerId, setBookmakerId] = React.useState(bookmakers[0]?.id ?? "");
  const [countryId, setCountryId] = React.useState("");
  const [offerId, setOfferId] = React.useState("");
  const [networkId, setNetworkId] = React.useState("");
  const [destinationUrl, setDestinationUrl] = React.useState("");
  const [linkResult, setLinkResult] = React.useState<AdminActionResult<unknown> | null>(null);

  const selectedBookmaker = bookmakers.find((b) => b.id === bookmakerId);

  const linkColumns: AdminTableColumn<AffiliateLinkRow>[] = [
    {
      accessorKey: "slug",
      header: "Slug /go/",
      cell: ({ row }) => <span className="font-mono font-semibold">/go/{row.original.slug}</span>,
    },
    { accessorKey: "bookmakerName", header: "Bookmaker" },
    { accessorKey: "allowedHost", header: "Hôte vérifié" },
    {
      accessorKey: "destinationUrl",
      header: "URL cible HTTPS",
      cell: ({ row }) => (
        <span className="block max-w-xs truncate text-xs text-fg-muted">
          {row.original.destinationUrl}
        </span>
      ),
    },
    {
      accessorKey: "active",
      header: "État",
      cell: ({ row }) => (
        <UiBadge tone={row.original.active ? "trust" : "neutral"}>
          {row.original.active ? "Actif" : row.original.status}
        </UiBadge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <DataTable
        data={links}
        columns={linkColumns}
        searchPlaceholder="Filtrer les liens /go/..."
        emptyTitle="Aucun lien d'affiliation"
        emptyDescription="Ajoutez un réseau (facultatif) et créez un lien HTTPS validé sur les hôtes autorisés du bookmaker."
      />

      {canManageLinks && bookmakers.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <EntityForm
            title="Nouveau lien d'affiliation (contrôle B1)"
            description={
              selectedBookmaker
                ? `Hôtes autorisés pour ${selectedBookmaker.name} : ${selectedBookmaker.allowedHosts.join(", ")}`
                : undefined
            }
            submitLabel="Créer le lien"
            result={linkResult}
            onSubmit={async (e) => {
              e.preventDefault();
              const res = await upsertAffiliateLinkAction({
                slug,
                bookmakerId,
                countryId: countryId || null,
                offerId: offerId || null,
                networkId: networkId || null,
                destinationUrl,
                active: true,
                status: "active",
              });
              setLinkResult(res);
              if (res.ok) {
                setSlug("");
                setDestinationUrl("");
                router.refresh();
              }
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="al-bm" className="text-xs font-semibold text-fg">
                  Bookmaker *
                </label>
                <select
                  id="al-bm"
                  value={bookmakerId}
                  onChange={(e) => setBookmakerId(e.target.value)}
                  className="h-10 w-full rounded-input border border-border bg-surface px-2 text-sm text-fg"
                >
                  {bookmakers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="al-slug" className="text-xs font-semibold text-fg">
                  Slug public (/go/...) *
                </label>
                <Input
                  id="al-slug"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="betclic-bj"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label htmlFor="al-url" className="text-xs font-semibold text-fg">
                  URL de destination HTTPS *
                </label>
                <Input
                  id="al-url"
                  type="url"
                  required
                  value={destinationUrl}
                  onChange={(e) => setDestinationUrl(e.target.value)}
                  placeholder="https://promo.betclic.ci/offres"
                />
              </div>
              <select
                aria-label="Pays"
                value={countryId}
                onChange={(e) => setCountryId(e.target.value)}
                className="h-10 rounded-input border border-border bg-surface px-2 text-sm text-fg"
              >
                <option value="">Tous pays</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} · {c.nameFr}
                  </option>
                ))}
              </select>
              <select
                aria-label="Réseau"
                value={networkId}
                onChange={(e) => setNetworkId(e.target.value)}
                className="h-10 rounded-input border border-border bg-surface px-2 text-sm text-fg"
              >
                <option value="">Sans réseau partenaire</option>
                {networks.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Offre liée"
                value={offerId}
                onChange={(e) => setOfferId(e.target.value)}
                className="h-10 rounded-input border border-border bg-surface px-2 text-sm text-fg sm:col-span-2"
              >
                <option value="">Aucune offre spécifique</option>
                {offers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.titleFr}
                  </option>
                ))}
              </select>
            </div>
          </EntityForm>

          <NetworkFormSection networksCount={networks.length} />
        </div>
      ) : null}
    </div>
  );
}
