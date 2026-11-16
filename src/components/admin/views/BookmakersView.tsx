"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { DataTable, type AdminTableColumn } from "@/components/admin/DataTable";
import { EntityForm } from "@/components/admin/EntityForm";
import { MediaUploader } from "@/components/admin/MediaUploader";
import { UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import type { AdminActionResult } from "@/lib/admin/action-result";
import { saveBookmakerAction } from "@/modules/offers/actions";

export interface BookmakerListRow {
  id: string;
  name: string;
  slug: string;
  logoAssetId: string | null;
  logoUrl: string | null;
  allowedHosts: string[];
  appPlatforms: string[];
  foundedYear: number | null;
  status: string;
}

interface BookmakerFormValues {
  name: string;
  slug: string;
  allowedHostsRaw: string;
  foundedYear: string;
  descriptionFr: string;
  descriptionEn: string;
  status: "active" | "inactive" | "archived";
}

export function BookmakersView({
  bookmakers,
  canWrite,
}: {
  bookmakers: BookmakerListRow[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [logoAssetId, setLogoAssetId] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<AdminActionResult<unknown> | null>(null);

  const form = useForm<BookmakerFormValues>({
    defaultValues: {
      name: "",
      slug: "",
      allowedHostsRaw: "",
      foundedYear: "",
      descriptionFr: "",
      descriptionEn: "",
      status: "active",
    },
  });

  async function onSubmit(values: BookmakerFormValues) {
    setResult(null);
    const res = await saveBookmakerAction({
      name: values.name,
      slug: values.slug,
      logoAssetId,
      allowedHosts: values.allowedHostsRaw,
      foundedYear: values.foundedYear ? Number(values.foundedYear) : null,
      descriptionFr: values.descriptionFr,
      descriptionEn: values.descriptionEn,
      status: values.status,
      appPlatforms: ["web", "android", "ios"],
    });
    setResult(res);
    if (res.ok) {
      form.reset();
      setLogoAssetId(null);
      router.refresh();
    }
  }

  const columns: AdminTableColumn<BookmakerListRow>[] = [
    {
      accessorKey: "name",
      header: "Bookmaker",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          {row.original.logoUrl ? (
            <Image
              src={row.original.logoUrl}
              alt={row.original.name}
              width={32}
              height={32}
              className="h-8 w-8 rounded border border-border bg-surface object-contain p-0.5"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded border border-border bg-surface-subtle text-xs font-bold text-fg-muted">
              {row.original.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <Link
              href={`/admin/bookmakers/${row.original.id}`}
              className="font-semibold text-fg hover:text-brand-primary"
            >
              {row.original.name}
            </Link>
            <p className="text-xs text-fg-muted">/{row.original.slug}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "allowedHosts",
      header: "Hôtes autorisés",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-xs text-fg-muted">{row.original.allowedHosts.join(", ")}</span>
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
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/bookmakers/${row.original.id}`}>Ouvrir la fiche</Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <DataTable
        data={bookmakers}
        columns={columns}
        searchPlaceholder="Filtrer par nom ou slug..."
        emptyTitle="Aucun bookmaker enregistré"
        emptyDescription="Ajoutez un premier bookmaker vérifié avec ses hôtes autorisés ci-dessous."
      />

      {canWrite ? (
        <EntityForm
          title="Nouveau bookmaker"
          description="Saisissez les informations officielles et au moins un domaine autorisé pour les liens d'affiliation."
          submitLabel="Créer le bookmaker"
          isSubmitting={form.formState.isSubmitting}
          result={result}
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="bm-name" className="text-xs font-semibold text-fg">
                Nom officiel *
              </label>
              <Input id="bm-name" required {...form.register("name")} placeholder="Betclic" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="bm-slug" className="text-xs font-semibold text-fg">
                Slug URL *
              </label>
              <Input id="bm-slug" required {...form.register("slug")} placeholder="betclic" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="bm-hosts" className="text-xs font-semibold text-fg">
                Hôtes autorisés (séparés par virgules) *
              </label>
              <Input
                id="bm-hosts"
                required
                {...form.register("allowedHostsRaw")}
                placeholder="betclic.ci, promo.betclic.com"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="bm-year" className="text-xs font-semibold text-fg">
                Année de création
              </label>
              <Input
                id="bm-year"
                type="number"
                {...form.register("foundedYear")}
                placeholder="2005"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="bm-desc-fr" className="text-xs font-semibold text-fg">
                Présentation (FR)
              </label>
              <textarea
                id="bm-desc-fr"
                rows={2}
                {...form.register("descriptionFr")}
                className="w-full rounded-input border border-border bg-surface px-3 py-2 text-sm text-fg"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="bm-desc-en" className="text-xs font-semibold text-fg">
                Présentation (EN)
              </label>
              <textarea
                id="bm-desc-en"
                rows={2}
                {...form.register("descriptionEn")}
                className="w-full rounded-input border border-border bg-surface px-3 py-2 text-sm text-fg"
              />
            </div>
          </div>
          <MediaUploader
            label="Logo du bookmaker"
            hint="PNG, JPEG ou WebP uniquement · max 2 Mo · EXIF supprimés et image ré-encodée"
            onUploaded={(asset) => setLogoAssetId(asset.id)}
          />
        </EntityForm>
      ) : null}
    </div>
  );
}
