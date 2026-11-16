"use client";

import { DataTable, type AdminTableColumn } from "@/components/admin/DataTable";
import { CreateOfferForm } from "@/components/admin/views/CreateOfferForm";
import { UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export interface OfferListRow {
  id: string;
  slug: string;
  titleFr: string;
  titleEn: string;
  offerType: string;
  bonusAmount: string | null;
  currencyCode: string;
  bonusPercentage: number | null;
  status: string;
  lastVerifiedAt: Date | string | null;
  bookmakerName: string;
}

export function OffersView({
  offers,
  bookmakers,
  countries,
  canWrite,
}: {
  offers: OfferListRow[];
  bookmakers: Array<{ id: string; name: string }>;
  countries: Array<{ id: string; code: string; nameFr: string; currencyCode: string }>;
  canWrite: boolean;
}) {
  const columns: AdminTableColumn<OfferListRow>[] = [
    {
      accessorKey: "titleFr",
      header: "Offre",
      cell: ({ row }) => (
        <div>
          <Link
            href={`/admin/offres/${row.original.id}`}
            className="font-semibold text-fg hover:text-brand-primary"
          >
            {row.original.titleFr}
          </Link>
          <p className="text-xs text-fg-muted">
            {row.original.bookmakerName} · /{row.original.slug}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "bonusAmount",
      header: "Bonus",
      cell: ({ row }) => (
        <span className="font-medium text-fg">
          {row.original.bonusAmount
            ? `${row.original.bonusAmount} ${row.original.currencyCode}`
            : "—"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Statut",
      cell: ({ row }) => {
        const tone =
          row.original.status === "published"
            ? "trust"
            : row.original.status === "draft"
              ? "warning"
              : "neutral";
        return <UiBadge tone={tone}>{row.original.status}</UiBadge>;
      },
    },
    {
      accessorKey: "lastVerifiedAt",
      header: "Dernière vérif.",
      cell: ({ row }) => (
        <span className="text-xs text-fg-muted">
          {row.original.lastVerifiedAt
            ? new Date(row.original.lastVerifiedAt).toLocaleDateString("fr-FR")
            : "Non vérifiée"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/offres/${row.original.id}`}>Gérer</Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <DataTable
        data={offers}
        columns={columns}
        searchPlaceholder="Filtrer les offres..."
        emptyTitle="Aucune offre enregistrée"
        emptyDescription="Créez d'abord un bookmaker puis saisissez une offre réelle en brouillon ci-dessous."
      />

      {canWrite && bookmakers.length > 0 ? (
        <CreateOfferForm bookmakers={bookmakers} countries={countries} />
      ) : null}
    </div>
  );
}
