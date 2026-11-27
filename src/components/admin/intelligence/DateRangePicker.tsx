"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { MetricGroupBy } from "@/modules/intelligence/schema";
import type { IntelligenceFilterOptions } from "@/modules/intelligence/stats-types";

export interface DateRangePickerProps {
  fromDate: string;
  toDate: string;
  country: string;
  bookmakerId: string;
  campaignId: string;
  groupBy: MetricGroupBy;
  includeReference: boolean;
  options: IntelligenceFilterOptions;
  locale: "fr" | "en";
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function DateRangePicker({
  fromDate,
  toDate,
  country,
  bookmakerId,
  campaignId,
  groupBy,
  includeReference,
  options,
  locale,
}: DateRangePickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [from, setFrom] = React.useState(fromDate);
  const [to, setTo] = React.useState(toDate);
  const [ctry, setCtry] = React.useState(country);
  const [bm, setBm] = React.useState(bookmakerId);
  const [camp, setCamp] = React.useState(campaignId);
  const [grp, setGrp] = React.useState<MetricGroupBy>(groupBy);

  function pushParams(
    overrides?: Partial<{
      from: string;
      to: string;
      country: string;
      bookmakerId: string;
      campaignId: string;
      groupBy: MetricGroupBy;
      demo: "0" | "1";
    }>,
  ) {
    const sp = new URLSearchParams();
    const f = overrides?.from ?? from;
    const t = overrides?.to ?? to;
    const c = overrides?.country ?? ctry;
    const b = overrides?.bookmakerId ?? bm;
    const cp = overrides?.campaignId ?? camp;
    const g = overrides?.groupBy ?? grp;
    const d = overrides?.demo ?? (includeReference ? "1" : "0");

    if (f) sp.set("from", f);
    if (t) sp.set("to", t);
    if (c && c !== "ALL") sp.set("country", c);
    if (b) sp.set("bookmakerId", b);
    if (cp) sp.set("campaignId", cp);
    if (g !== "day") sp.set("groupBy", g);
    if (d === "0") sp.set("demo", "0");

    router.push(`${pathname}?${sp.toString()}`);
  }

  function applyPreset(days: number) {
    const nextFrom = daysAgoIso(days - 1);
    const nextTo = daysAgoIso(0);
    setFrom(nextFrom);
    setTo(nextTo);
    pushParams({ from: nextFrom, to: nextTo });
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { label: "7 j", days: 7 },
            { label: "30 j", days: 30 },
            { label: "90 j", days: 90 },
            { label: locale === "en" ? "12 mo" : "12 mois", days: 365 },
          ].map((preset) => (
            <Button
              key={preset.days}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset(preset.days)}
            >
              {preset.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-1.5" role="group" aria-label="Granularité">
          {(["day", "week", "month"] as const).map((mode) => (
            <Button
              key={mode}
              type="button"
              size="sm"
              variant={grp === mode ? "primary" : "outline"}
              onClick={() => {
                setGrp(mode);
                pushParams({ groupBy: mode });
              }}
            >
              {mode === "day"
                ? locale === "en"
                  ? "Day"
                  : "Jour"
                : mode === "week"
                  ? locale === "en"
                    ? "Week"
                    : "Semaine"
                  : locale === "en"
                    ? "Month"
                    : "Mois"}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant={includeReference ? "primary" : "outline"}
            size="sm"
            onClick={() => pushParams({ demo: "1" })}
          >
            {locale === "en" ? "Combined (Demo + Real)" : "Combiné (Référence + Réel)"}
          </Button>
          <Button
            type="button"
            variant={!includeReference ? "primary" : "outline"}
            size="sm"
            onClick={() => pushParams({ demo: "0" })}
          >
            {locale === "en" ? "Real data only" : "Données réelles uniquement"}
          </Button>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          pushParams();
        }}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6"
      >
        <div className="space-y-1">
          <label htmlFor="stats-from" className="text-xs font-medium text-fg-muted">
            {locale === "en" ? "From" : "Du"}
          </label>
          <Input
            id="stats-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="stats-to" className="text-xs font-medium text-fg-muted">
            {locale === "en" ? "To" : "Au"}
          </label>
          <Input id="stats-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label htmlFor="stats-country" className="text-xs font-medium text-fg-muted">
            {locale === "en" ? "Country" : "Pays"}
          </label>
          <select
            id="stats-country"
            value={ctry}
            onChange={(e) => setCtry(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg"
          >
            <option value="ALL">{locale === "en" ? "All countries" : "Tous les pays"}</option>
            {options.countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} · {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="stats-bookmaker" className="text-xs font-medium text-fg-muted">
            Bookmaker
          </label>
          <select
            id="stats-bookmaker"
            value={bm}
            onChange={(e) => setBm(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg"
          >
            <option value="">{locale === "en" ? "All bookmakers" : "Tous"}</option>
            {options.bookmakers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="stats-campaign" className="text-xs font-medium text-fg-muted">
            {locale === "en" ? "Campaign" : "Campagne"}
          </label>
          <select
            id="stats-campaign"
            value={camp}
            onChange={(e) => setCamp(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg"
          >
            <option value="">{locale === "en" ? "All campaigns" : "Toutes"}</option>
            {options.campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <Button type="submit" className="w-full">
            {locale === "en" ? "Apply filters" : "Appliquer"}
          </Button>
        </div>
      </form>
    </div>
  );
}
