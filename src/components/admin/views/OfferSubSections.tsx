"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AdminActionResult } from "@/lib/admin/action-result";
import {
  addOfferHighlightAction,
  addOfferTermAction,
  upsertPromoCodeAction,
} from "@/modules/offers/actions";

export interface OfferSubSectionsProps {
  offerId: string;
  bookmakerId: string;
  terms: Array<{ id: string; locale: string; title: string; body: string }>;
  highlights: Array<{ id: string; locale: string; polarity: string; label: string }>;
  promoCodes: Array<{ id: string; code: string; status: string }>;
  canWrite: boolean;
  onResult: (res: AdminActionResult<unknown>) => void;
}

export function OfferSubSections({
  offerId,
  bookmakerId,
  terms,
  highlights,
  promoCodes,
  canWrite,
  onResult,
}: OfferSubSectionsProps) {
  const router = useRouter();
  const [termTitle, setTermTitle] = React.useState("");
  const [termBody, setTermBody] = React.useState("");
  const [hlLabel, setHlLabel] = React.useState("");
  const [hlPolarity, setHlPolarity] = React.useState<"positive" | "negative">("positive");
  const [promoCodeInput, setPromoCodeInput] = React.useState("");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conditions détaillées ({terms.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {terms.map((t) => (
            <div key={t.id} className="rounded border border-border p-2.5 text-sm">
              <p className="font-semibold text-fg">{t.title}</p>
              <p className="mt-1 text-xs text-fg-muted">{t.body}</p>
            </div>
          ))}
          {canWrite ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await addOfferTermAction({
                  offerId,
                  locale: "fr",
                  title: termTitle,
                  body: termBody,
                });
                onResult(res);
                if (res.ok) {
                  setTermTitle("");
                  setTermBody("");
                  router.refresh();
                }
              }}
              className="space-y-2 border-t border-border pt-3"
            >
              <Input
                placeholder="Titre de la condition"
                value={termTitle}
                onChange={(e) => setTermTitle(e.target.value)}
              />
              <Input
                placeholder="Détail complet de la condition"
                value={termBody}
                onChange={(e) => setTermBody(e.target.value)}
              />
              <Button type="submit" size="sm">
                Ajouter une condition
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Arguments & codes promo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {highlights.map((h) => (
            <div
              key={h.id}
              className="flex items-center justify-between rounded border border-border p-2 text-xs"
            >
              <span className="text-fg">{h.label}</span>
              <UiBadge tone={h.polarity === "positive" ? "trust" : "warning"}>
                {h.polarity === "positive" ? "+" : "-"}
              </UiBadge>
            </div>
          ))}
          {promoCodes.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded border border-dashed border-brand-primary p-2 text-xs"
            >
              <strong className="font-mono text-fg">{p.code}</strong>
              <UiBadge tone="accent">{p.status}</UiBadge>
            </div>
          ))}
          {canWrite ? (
            <div className="space-y-3 border-t border-border pt-3">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await addOfferHighlightAction({
                    offerId,
                    locale: "fr",
                    polarity: hlPolarity,
                    label: hlLabel,
                  });
                  onResult(res);
                  if (res.ok) {
                    setHlLabel("");
                    router.refresh();
                  }
                }}
                className="flex flex-wrap gap-2"
              >
                <select
                  aria-label="Polarité"
                  value={hlPolarity}
                  onChange={(e) => setHlPolarity(e.target.value as "positive" | "negative")}
                  className="h-10 rounded-input border border-border bg-surface px-2 text-xs text-fg"
                >
                  <option value="positive">Point fort (+)</option>
                  <option value="negative">Point d&apos;attention (-)</option>
                </select>
                <Input
                  className="flex-1"
                  placeholder="Argument affiché sur la carte"
                  value={hlLabel}
                  onChange={(e) => setHlLabel(e.target.value)}
                />
                <Button type="submit" size="sm">
                  Ajouter
                </Button>
              </form>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await upsertPromoCodeAction({
                    bookmakerId,
                    offerId,
                    code: promoCodeInput,
                    status: "active",
                  });
                  onResult(res);
                  if (res.ok) {
                    setPromoCodeInput("");
                    router.refresh();
                  }
                }}
                className="flex gap-2"
              >
                <Input
                  placeholder="CODEPROMO"
                  value={promoCodeInput}
                  onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                />
                <Button type="submit" size="sm" variant="secondary">
                  Lier un code
                </Button>
              </form>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
