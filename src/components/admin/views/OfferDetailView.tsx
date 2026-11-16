"use client";

import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { AuditTimeline, type AuditTimelineItem } from "@/components/admin/AuditTimeline";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { EntityForm } from "@/components/admin/EntityForm";
import { OfferSubSections } from "@/components/admin/views/OfferSubSections";
import { UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AdminActionResult } from "@/lib/admin/action-result";
import {
  deleteOfferAction,
  markOfferVerifiedAction,
  saveOfferAction,
  transitionOfferStatusAction,
} from "@/modules/offers/actions";

export interface OfferDetailViewProps {
  offer: {
    id: string;
    bookmakerId: string;
    bookmakerName: string;
    offerType: "welcome" | "special" | "reload" | "cashback";
    slug: string;
    titleFr: string;
    titleEn: string;
    bonusAmount: string | null;
    currencyCode: string;
    minDeposit: string | null;
    rolloverText: string;
    status: string;
    rankOrder: number;
    lastVerifiedAt: Date | string | null;
  };
  selectedCountryIds: string[];
  countries: Array<{ id: string; code: string; nameFr: string }>;
  terms: Array<{ id: string; locale: string; title: string; body: string }>;
  highlights: Array<{ id: string; locale: string; polarity: string; label: string }>;
  promoCodes: Array<{ id: string; code: string; status: string }>;
  auditItems: AuditTimelineItem[];
  canWrite: boolean;
  canPublish: boolean;
  canDelete: boolean;
}

export function OfferDetailView({
  offer,
  selectedCountryIds,
  countries,
  terms,
  highlights,
  promoCodes,
  auditItems,
  canWrite,
  canPublish,
  canDelete,
}: OfferDetailViewProps) {
  const router = useRouter();
  const [titleFr, setTitleFr] = React.useState(offer.titleFr);
  const [titleEn, setTitleEn] = React.useState(offer.titleEn);
  const [bonusAmount, setBonusAmount] = React.useState(offer.bonusAmount ?? "");
  const [currencyCode, setCurrencyCode] = React.useState(offer.currencyCode);
  const [minDeposit, setMinDeposit] = React.useState(offer.minDeposit ?? "");
  const [rolloverText, setRolloverText] = React.useState(offer.rolloverText);
  const [countryIds, setCountryIds] = React.useState(selectedCountryIds);
  const [statusResult, setStatusResult] = React.useState<AdminActionResult<unknown> | null>(null);
  const [editResult, setEditResult] = React.useState<AdminActionResult<unknown> | null>(null);

  async function runStatus(nextStatus: string) {
    const res = await transitionOfferStatusAction(offer.id, nextStatus);
    setStatusResult(res);
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Cycle de vie et fraîcheur réelle</CardTitle>
              <p className="mt-1 text-xs text-fg-muted">
                Statut actuel : <strong className="text-fg">{offer.status}</strong> · Dernière
                vérification :{" "}
                <strong className="text-fg">
                  {offer.lastVerifiedAt
                    ? new Date(offer.lastVerifiedAt).toLocaleString("fr-FR")
                    : "Jamais vérifiée manuellement"}
                </strong>
              </p>
            </div>
            <UiBadge tone={offer.status === "published" ? "trust" : "warning"}>
              {offer.status}
            </UiBadge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {statusResult ? (
            <div
              role="status"
              className={
                statusResult.ok
                  ? "rounded-lg border border-success/40 bg-success-soft px-3 py-2 text-sm text-fg"
                  : "rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger"
              }
            >
              {statusResult.message}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {canWrite ? (
              <Button
                type="button"
                size="sm"
                onClick={async () => {
                  const res = await markOfferVerifiedAction(offer.id);
                  setStatusResult(res);
                  if (res.ok) router.refresh();
                }}
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Marquer comme vérifiée aujourd&apos;hui
              </Button>
            ) : null}
            {canPublish && offer.status !== "published" ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => runStatus("published")}
              >
                Publier l&apos;offre
              </Button>
            ) : null}
            {canWrite && offer.status !== "draft" ? (
              <Button type="button" variant="outline" size="sm" onClick={() => runStatus("draft")}>
                Repasser en brouillon
              </Button>
            ) : null}
            {canWrite && offer.status !== "disabled" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => runStatus("disabled")}
              >
                Désactiver
              </Button>
            ) : null}
            {canWrite && offer.status !== "archived" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => runStatus("archived")}
              >
                Archiver
              </Button>
            ) : null}
            {canDelete ? (
              <ConfirmDialog
                triggerLabel="Supprimer définitivement"
                title="Confirmer la suppression définitive"
                description="Cette suppression est irréversible et journalisée dans audit_log."
                expectedName={offer.titleFr}
                inputLabel="Saisissez le titre exact de l'offre"
                confirmLabel="Supprimer définitivement"
                onConfirm={async (typed) => {
                  const res = await deleteOfferAction(offer.id, typed);
                  if (res.ok) router.push("/admin/offres");
                  return res;
                }}
              />
            ) : null}
          </div>
        </CardContent>
      </Card>

      {canWrite ? (
        <EntityForm
          title="Modifier l'offre"
          submitLabel="Enregistrer les modifications"
          result={editResult}
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await saveOfferAction({
              id: offer.id,
              bookmakerId: offer.bookmakerId,
              offerType: offer.offerType,
              slug: offer.slug,
              titleFr,
              titleEn,
              bonusAmount,
              currencyCode,
              minDeposit,
              rolloverText,
              rankOrder: offer.rankOrder,
              countryIds,
            });
            setEditResult(res);
            if (res.ok) router.refresh();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { id: "ed-title-fr", label: "Titre (FR)", val: titleFr, set: setTitleFr },
              { id: "ed-title-en", label: "Titre (EN)", val: titleEn, set: setTitleEn },
              { id: "ed-amount", label: "Montant", val: bonusAmount, set: setBonusAmount },
              { id: "ed-min-dep", label: "Dépôt min", val: minDeposit, set: setMinDeposit },
            ].map((field) => (
              <div key={field.id} className="space-y-1.5">
                <label htmlFor={field.id} className="text-xs font-semibold text-fg">
                  {field.label}
                </label>
                <Input
                  id={field.id}
                  value={field.val}
                  onChange={(e) => field.set(e.target.value)}
                />
              </div>
            ))}
            <div className="space-y-1.5">
              <label htmlFor="ed-curr" className="text-xs font-semibold text-fg">
                Devise
              </label>
              <Input
                id="ed-curr"
                maxLength={3}
                value={currencyCode}
                onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="ed-roll" className="text-xs font-semibold text-fg">
                Rollover / condition résumée
              </label>
              <Input
                id="ed-roll"
                value={rolloverText}
                onChange={(e) => setRolloverText(e.target.value)}
              />
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-fg">Pays éligibles</legend>
            <div className="grid max-h-32 grid-cols-2 gap-2 overflow-y-auto rounded border border-border p-3 sm:grid-cols-4">
              {countries.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-xs text-fg">
                  <input
                    type="checkbox"
                    checked={countryIds.includes(c.id)}
                    onChange={(e) =>
                      setCountryIds((prev) =>
                        e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id),
                      )
                    }
                  />
                  {c.code} · {c.nameFr}
                </label>
              ))}
            </div>
          </fieldset>
        </EntityForm>
      ) : null}

      <OfferSubSections
        offerId={offer.id}
        bookmakerId={offer.bookmakerId}
        terms={terms}
        highlights={highlights}
        promoCodes={promoCodes}
        canWrite={canWrite}
        onResult={setStatusResult}
      />

      <AuditTimeline
        title="Journal de l'offre"
        emptyLabel="Aucune écriture pour cette offre."
        items={auditItems}
      />
    </div>
  );
}
