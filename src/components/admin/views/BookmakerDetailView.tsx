"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { AuditTimeline, type AuditTimelineItem } from "@/components/admin/AuditTimeline";
import { EntityForm } from "@/components/admin/EntityForm";
import { MediaUploader } from "@/components/admin/MediaUploader";
import { BookmakerSubSections } from "@/components/admin/views/BookmakerSubSections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminActionResult } from "@/lib/admin/action-result";
import { archiveBookmakerAction, saveBookmakerAction } from "@/modules/offers/actions";

export interface BookmakerDetailProps {
  bookmaker: {
    id: string;
    name: string;
    slug: string;
    logoAssetId: string | null;
    logoUrl: string | null;
    descriptionFr: string;
    descriptionEn: string;
    foundedYear: number | null;
    allowedHosts: string[];
    status: string;
  };
  countries: Array<{ id: string; code: string; nameFr: string; currencyCode: string }>;
  paymentMethods: Array<{ id: string; name: string }>;
  eligibilityRows: Array<{
    id: string;
    countryId: string;
    countryCode: string;
    countryNameFr: string;
    eligible: boolean;
    localLicense: string;
    authorityName: string;
    countryScore: string | null;
  }>;
  paymentRows: Array<{
    id: string;
    paymentMethodName: string;
    countryCode: string;
    minDepositAmount: string | null;
    currencyCode: string;
    supportsDeposit: boolean;
    supportsWithdrawal: boolean;
  }>;
  ratingRows: Array<{
    id: string;
    gridVersion: string;
    bonusScore: string;
    paymentsScore: string;
    oddsScore: string;
    appScore: string;
    supportScore: string;
    finalScore: string;
    scoredAt: Date | string;
  }>;
  auditItems: AuditTimelineItem[];
  canWrite: boolean;
}

export function BookmakerDetailView({
  bookmaker,
  countries,
  paymentMethods,
  eligibilityRows,
  paymentRows,
  ratingRows,
  auditItems,
  canWrite,
}: BookmakerDetailProps) {
  const router = useRouter();
  const [name, setName] = React.useState(bookmaker.name);
  const [slug, setSlug] = React.useState(bookmaker.slug);
  const [hosts, setHosts] = React.useState(bookmaker.allowedHosts.join(", "));
  const [logoAssetId, setLogoAssetId] = React.useState<string | null>(bookmaker.logoAssetId);
  const [descFr, setDescFr] = React.useState(bookmaker.descriptionFr);
  const [descEn, setDescEn] = React.useState(bookmaker.descriptionEn);
  const [editResult, setEditResult] = React.useState<AdminActionResult<unknown> | null>(null);
  const [subResult, setSubResult] = React.useState<AdminActionResult<unknown> | null>(null);

  return (
    <div className="space-y-6">
      {subResult ? (
        <div
          role="status"
          className={
            subResult.ok
              ? "rounded-lg border border-success/40 bg-success-soft px-3 py-2 text-sm text-fg"
              : "rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger"
          }
        >
          {subResult.message}
        </div>
      ) : null}

      {canWrite ? (
        <EntityForm
          title="Modifier la fiche bookmaker"
          submitLabel="Enregistrer"
          result={editResult}
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await saveBookmakerAction({
              id: bookmaker.id,
              name,
              slug,
              logoAssetId,
              allowedHosts: hosts,
              descriptionFr: descFr,
              descriptionEn: descEn,
              foundedYear: bookmaker.foundedYear,
              status: bookmaker.status,
              appPlatforms: ["web", "android", "ios"],
            });
            setEditResult(res);
            if (res.ok) router.refresh();
          }}
          footerExtra={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                const res = await archiveBookmakerAction(bookmaker.id);
                setEditResult(res);
                if (res.ok) router.refresh();
              }}
            >
              Archiver ce bookmaker
            </Button>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="edit-bm-name" className="text-xs font-semibold text-fg">
                Nom
              </label>
              <Input id="edit-bm-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="edit-bm-slug" className="text-xs font-semibold text-fg">
                Slug
              </label>
              <Input id="edit-bm-slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="edit-bm-hosts" className="text-xs font-semibold text-fg">
                Hôtes autorisés
              </label>
              <Input id="edit-bm-hosts" value={hosts} onChange={(e) => setHosts(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="edit-bm-fr" className="text-xs font-semibold text-fg">
                Description FR
              </label>
              <textarea
                id="edit-bm-fr"
                rows={2}
                value={descFr}
                onChange={(e) => setDescFr(e.target.value)}
                className="w-full rounded-input border border-border bg-surface px-3 py-2 text-sm text-fg"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="edit-bm-en" className="text-xs font-semibold text-fg">
                Description EN
              </label>
              <textarea
                id="edit-bm-en"
                rows={2}
                value={descEn}
                onChange={(e) => setDescEn(e.target.value)}
                className="w-full rounded-input border border-border bg-surface px-3 py-2 text-sm text-fg"
              />
            </div>
          </div>
          <MediaUploader
            label="Logo du bookmaker"
            hint="PNG, JPEG ou WebP <= 2 Mo"
            currentUrl={bookmaker.logoUrl}
            onUploaded={(asset) => setLogoAssetId(asset.id)}
          />
        </EntityForm>
      ) : null}

      <BookmakerSubSections
        bookmakerId={bookmaker.id}
        countries={countries}
        paymentMethods={paymentMethods}
        eligibilityRows={eligibilityRows}
        paymentRows={paymentRows}
        ratingRows={ratingRows}
        canWrite={canWrite}
        onResult={setSubResult}
      />

      <AuditTimeline
        title="Journal des modifications"
        emptyLabel="Aucune écriture enregistrée."
        items={auditItems}
      />
    </div>
  );
}
