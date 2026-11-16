"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { EntityForm } from "@/components/admin/EntityForm";
import { Input } from "@/components/ui/input";
import type { AdminActionResult } from "@/lib/admin/action-result";
import { saveOfferAction } from "@/modules/offers/actions";

export function CreateOfferForm({
  bookmakers,
  countries,
}: {
  bookmakers: Array<{ id: string; name: string }>;
  countries: Array<{ id: string; code: string; nameFr: string; currencyCode: string }>;
}) {
  const router = useRouter();
  const [bookmakerId, setBookmakerId] = React.useState(bookmakers[0]?.id ?? "");
  const [offerType, setOfferType] = React.useState<"welcome" | "special" | "reload" | "cashback">(
    "welcome",
  );
  const [slug, setSlug] = React.useState("");
  const [titleFr, setTitleFr] = React.useState("");
  const [titleEn, setTitleEn] = React.useState("");
  const [bonusAmount, setBonusAmount] = React.useState("");
  const [currencyCode, setCurrencyCode] = React.useState(countries[0]?.currencyCode ?? "XOF");
  const [minDeposit, setMinDeposit] = React.useState("");
  const [rolloverText, setRolloverText] = React.useState("");
  const [selectedCountries, setSelectedCountries] = React.useState<string[]>(
    countries[0] ? [countries[0].id] : [],
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<AdminActionResult<unknown> | null>(null);

  return (
    <EntityForm
      title="Nouvelle offre (créée en brouillon)"
      description="Une offre créée reste en statut brouillon jusqu'à validation et publication explicite par un rôle autorisé."
      submitLabel="Créer le brouillon"
      isSubmitting={submitting}
      result={result}
      onSubmit={async (e) => {
        e.preventDefault();
        setSubmitting(true);
        const res = await saveOfferAction({
          bookmakerId,
          offerType,
          slug,
          titleFr,
          titleEn,
          bonusAmount,
          currencyCode,
          minDeposit,
          rolloverText,
          rankOrder: 100,
          countryIds: selectedCountries,
        });
        setSubmitting(false);
        setResult(res);
        if (res.ok) {
          setSlug("");
          setTitleFr("");
          setTitleEn("");
          router.refresh();
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="offer-bm" className="text-xs font-semibold text-fg">
            Bookmaker *
          </label>
          <select
            id="offer-bm"
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
          <label htmlFor="offer-type" className="text-xs font-semibold text-fg">
            Type d&apos;offre
          </label>
          <select
            id="offer-type"
            value={offerType}
            onChange={(e) => setOfferType(e.target.value as typeof offerType)}
            className="h-10 w-full rounded-input border border-border bg-surface px-3 text-sm text-fg"
          >
            <option value="welcome">Bienvenue</option>
            <option value="special">Spéciale</option>
            <option value="reload">Recharge</option>
            <option value="cashback">Cashback</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="offer-title-fr" className="text-xs font-semibold text-fg">
            Titre (FR) *
          </label>
          <Input
            id="offer-title-fr"
            required
            value={titleFr}
            onChange={(e) => setTitleFr(e.target.value)}
            placeholder="100% jusqu'à 100 000 XOF"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="offer-title-en" className="text-xs font-semibold text-fg">
            Titre (EN) *
          </label>
          <Input
            id="offer-title-en"
            required
            value={titleEn}
            onChange={(e) => setTitleEn(e.target.value)}
            placeholder="100% up to 100,000 XOF"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="offer-slug" className="text-xs font-semibold text-fg">
            Slug *
          </label>
          <Input
            id="offer-slug"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="betclic-bienvenue-bj"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <label htmlFor="offer-amount" className="text-xs font-semibold text-fg">
              Montant
            </label>
            <Input
              id="offer-amount"
              value={bonusAmount}
              onChange={(e) => setBonusAmount(e.target.value)}
              placeholder="100000"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="offer-curr" className="text-xs font-semibold text-fg">
              Devise
            </label>
            <Input
              id="offer-curr"
              maxLength={3}
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="offer-dep" className="text-xs font-semibold text-fg">
            Dépôt minimum
          </label>
          <Input
            id="offer-dep"
            value={minDeposit}
            onChange={(e) => setMinDeposit(e.target.value)}
            placeholder="500"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="offer-roll" className="text-xs font-semibold text-fg">
            Conditions / Rollover
          </label>
          <Input
            id="offer-roll"
            value={rolloverText}
            onChange={(e) => setRolloverText(e.target.value)}
            placeholder="5x cote min 1.50"
          />
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-fg">Pays éligibles *</legend>
        <div className="grid max-h-36 grid-cols-2 gap-2 overflow-y-auto rounded border border-border p-3 sm:grid-cols-4">
          {countries.map((country) => (
            <label key={country.id} className="flex items-center gap-2 text-xs text-fg">
              <input
                type="checkbox"
                checked={selectedCountries.includes(country.id)}
                onChange={(e) =>
                  setSelectedCountries((prev) =>
                    e.target.checked
                      ? [...prev, country.id]
                      : prev.filter((id) => id !== country.id),
                  )
                }
              />
              {country.code} · {country.nameFr}
            </label>
          ))}
        </div>
      </fieldset>
    </EntityForm>
  );
}
