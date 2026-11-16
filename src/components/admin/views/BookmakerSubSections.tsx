"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AdminActionResult } from "@/lib/admin/action-result";
import {
  addBookmakerRatingAction,
  upsertBookmakerCountryAction,
  upsertBookmakerPaymentMethodAction,
} from "@/modules/offers/actions";

export interface BookmakerSubSectionsProps {
  bookmakerId: string;
  countries: Array<{ id: string; code: string; nameFr: string; currencyCode: string }>;
  paymentMethods: Array<{ id: string; name: string }>;
  eligibilityRows: Array<{
    id: string;
    countryCode: string;
    countryNameFr: string;
    eligible: boolean;
    localLicense: string;
    authorityName: string;
  }>;
  paymentRows: Array<{
    id: string;
    paymentMethodName: string;
    countryCode: string;
    minDepositAmount: string | null;
    currencyCode: string;
  }>;
  ratingRows: Array<{
    id: string;
    bonusScore: string;
    paymentsScore: string;
    oddsScore: string;
    appScore: string;
    supportScore: string;
    finalScore: string;
  }>;
  canWrite: boolean;
  onResult: (res: AdminActionResult<unknown>) => void;
}

export function BookmakerSubSections({
  bookmakerId,
  countries,
  paymentMethods,
  eligibilityRows,
  paymentRows,
  ratingRows,
  canWrite,
  onResult,
}: BookmakerSubSectionsProps) {
  const router = useRouter();
  const [countryId, setCountryId] = React.useState(countries[0]?.id ?? "");
  const [localLicense, setLocalLicense] = React.useState("");
  const [authorityName, setAuthorityName] = React.useState("");
  const [pmId, setPmId] = React.useState(paymentMethods[0]?.id ?? "");
  const [pmMinDeposit, setPmMinDeposit] = React.useState("500");
  const [scores, setScores] = React.useState({
    bonusScore: "8.0",
    paymentsScore: "8.0",
    oddsScore: "7.5",
    appScore: "8.0",
    supportScore: "7.5",
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Fiches pays & licences ({eligibilityRows.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {eligibilityRows.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between rounded border border-border p-2.5 text-sm"
              >
                <div>
                  <span className="font-semibold text-fg">
                    {row.countryNameFr} ({row.countryCode})
                  </span>
                  {row.localLicense ? (
                    <p className="text-xs text-fg-muted">
                      Licence : {row.localLicense}{" "}
                      {row.authorityName ? `· ${row.authorityName}` : ""}
                    </p>
                  ) : null}
                </div>
                <UiBadge tone={row.eligible ? "trust" : "neutral"}>
                  {row.eligible ? "Éligible" : "Exclu"}
                </UiBadge>
              </div>
            ))}
            {canWrite ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await upsertBookmakerCountryAction({
                    bookmakerId,
                    countryId,
                    eligible: true,
                    localLicense,
                    authorityName,
                  });
                  onResult(res);
                  if (res.ok) {
                    setLocalLicense("");
                    setAuthorityName("");
                    router.refresh();
                  }
                }}
                className="grid gap-2 border-t border-border pt-3 sm:grid-cols-3"
              >
                <select
                  aria-label="Pays"
                  value={countryId}
                  onChange={(e) => setCountryId(e.target.value)}
                  className="h-10 rounded-input border border-border bg-surface px-2 text-sm text-fg"
                >
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameFr} ({c.code})
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="N° licence locale"
                  value={localLicense}
                  onChange={(e) => setLocalLicense(e.target.value)}
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="Autorité"
                    value={authorityName}
                    onChange={(e) => setAuthorityName(e.target.value)}
                  />
                  <Button type="submit" size="sm">
                    Ajouter
                  </Button>
                </div>
              </form>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Moyens de paiement ({paymentRows.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {paymentRows.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between rounded border border-border p-2.5 text-sm"
              >
                <span className="font-medium text-fg">
                  {row.paymentMethodName} · {row.countryCode}
                </span>
                <span className="text-xs text-fg-muted">
                  Dépôt min : {row.minDepositAmount ?? "—"} {row.currencyCode}
                </span>
              </div>
            ))}
            {canWrite ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const selectedCountry = countries.find((c) => c.id === countryId);
                  const res = await upsertBookmakerPaymentMethodAction({
                    bookmakerId,
                    paymentMethodId: pmId,
                    countryId,
                    minDepositAmount: pmMinDeposit,
                    currencyCode: selectedCountry?.currencyCode ?? "XOF",
                    supportsDeposit: true,
                    supportsWithdrawal: true,
                  });
                  onResult(res);
                  if (res.ok) router.refresh();
                }}
                className="grid gap-2 border-t border-border pt-3 sm:grid-cols-3"
              >
                <select
                  aria-label="Moyen de paiement"
                  value={pmId}
                  onChange={(e) => setPmId(e.target.value)}
                  className="h-10 rounded-input border border-border bg-surface px-2 text-sm text-fg"
                >
                  {paymentMethods.map((pm) => (
                    <option key={pm.id} value={pm.id}>
                      {pm.name}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="Dépôt min"
                  value={pmMinDeposit}
                  onChange={(e) => setPmMinDeposit(e.target.value)}
                />
                <Button type="submit" size="sm">
                  Associer
                </Button>
              </form>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Grilles de notation ({ratingRows.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ratingRows.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded border border-border p-3 text-sm"
            >
              <div className="flex flex-wrap gap-3 text-xs text-fg-muted">
                <span>
                  Bonus: <strong className="text-fg">{r.bonusScore}</strong>
                </span>
                <span>
                  Paiements: <strong className="text-fg">{r.paymentsScore}</strong>
                </span>
                <span>
                  Cotes: <strong className="text-fg">{r.oddsScore}</strong>
                </span>
                <span>
                  App: <strong className="text-fg">{r.appScore}</strong>
                </span>
                <span>
                  Support: <strong className="text-fg">{r.supportScore}</strong>
                </span>
              </div>
              <UiBadge tone="accent">Note finale : {r.finalScore} / 10</UiBadge>
            </div>
          ))}
          {canWrite ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await addBookmakerRatingAction({
                  bookmakerId,
                  gridVersion: "v1",
                  bonusScore: Number(scores.bonusScore),
                  paymentsScore: Number(scores.paymentsScore),
                  oddsScore: Number(scores.oddsScore),
                  appScore: Number(scores.appScore),
                  supportScore: Number(scores.supportScore),
                });
                onResult(res);
                if (res.ok) router.refresh();
              }}
              className="grid gap-3 border-t border-border pt-3 sm:grid-cols-6"
            >
              {(
                ["bonusScore", "paymentsScore", "oddsScore", "appScore", "supportScore"] as const
              ).map((key) => (
                <div key={key} className="space-y-1">
                  <label className="text-[11px] font-medium text-fg-muted">{key}</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={scores[key]}
                    onChange={(e) => setScores((prev) => ({ ...prev, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <div className="flex items-end">
                <Button type="submit" size="sm" className="w-full">
                  Noter (/10)
                </Button>
              </div>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
