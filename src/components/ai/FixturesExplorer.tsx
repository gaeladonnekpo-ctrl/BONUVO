"use client";

import * as React from "react";
import { CalendarRange, Filter, Search, Sparkles } from "lucide-react";
import { FixtureRow } from "@/components/ai/FixtureRow";
import { LeagueBadge } from "@/components/ai/SportCrest";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { LeagueFilterOption, PublicFixtureDto } from "@/modules/ai/service/public-ai-types";

export interface FixturesExplorerProps {
  fixtures: PublicFixtureDto[];
  leagues: LeagueFilterOption[];
  initialLeagueId?: string;
  locale?: string;
}

export function FixturesExplorer({
  fixtures,
  leagues,
  initialLeagueId,
  locale = "fr",
}: FixturesExplorerProps) {
  const isEn = locale === "en";
  const [selectedLeague, setSelectedLeague] = React.useState<string>(initialLeagueId ?? "all");
  const [confidenceFilter, setConfidenceFilter] = React.useState<"all" | "high" | "medium">("all");
  const [query, setQuery] = React.useState("");

  const leagueCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of fixtures) {
      const k = f.leagueName.toLowerCase();
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return counts;
  }, [fixtures]);

  const filteredFixtures = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return fixtures.filter((f) => {
      if (selectedLeague !== "all") {
        const chosen = leagues.find((l) => l.id === selectedLeague);
        if (
          f.leagueId !== selectedLeague &&
          (!chosen || chosen.name.toLowerCase() !== f.leagueName.toLowerCase())
        ) {
          return false;
        }
      }
      if (confidenceFilter !== "all") {
        const primary = f.predictions.find((p) => p.market === "1x2") ?? f.predictions[0];
        if (!primary) return false;
        if (confidenceFilter === "high" && primary.confidenceLevel !== "high") {
          return false;
        }
        if (
          confidenceFilter === "medium" &&
          primary.confidenceLevel !== "high" &&
          primary.confidenceLevel !== "medium"
        ) {
          return false;
        }
      }
      if (q) {
        const hay = `${f.homeTeamName} ${f.awayTeamName} ${f.leagueName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [fixtures, leagues, selectedLeague, confidenceFilter, query]);

  return (
    <section
      aria-label={isEn ? "Matches & AI Forecasts" : "Rencontres & Pronostics IA"}
      className="space-y-4"
    >
      {/* Mobile-First Swipeable Official Competition Carousel */}
      {leagues.length > 0 ? (
        <div
          role="navigation"
          aria-label={isEn ? "Filter by competition" : "Filtrer par compétition"}
          className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-2"
        >
          <button
            type="button"
            onClick={() => setSelectedLeague("all")}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
              selectedLeague === "all"
                ? "border-accent bg-accent text-accent-fg shadow-xs"
                : "border-border bg-surface text-fg hover:border-border-strong"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{isEn ? "All competitions" : "Toutes les compétitions"}</span>
            <span className="rounded-full bg-black/15 px-1.5 py-0.2 text-[10px]">
              {fixtures.length}
            </span>
          </button>

          {leagues.map((l) => {
            const isSelected = selectedLeague === l.id;
            const count = leagueCounts.get(l.name.toLowerCase()) ?? 0;
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => setSelectedLeague(l.id)}
                className="shrink-0 focus:outline-none"
              >
                <LeagueBadge
                  name={count > 0 ? `${l.name} (${count})` : l.name}
                  logoUrl={l.logoUrl}
                  active={isSelected}
                  className="cursor-pointer py-1.5 px-3 hover:border-accent/60"
                />
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Mobile-First Search & Confidence Filter Bar */}
      <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-surface-subtle/70 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              isEn
                ? "Search club or competition (e.g. PSG, Arsenal, Real Madrid)..."
                : "Rechercher un club ou une compétition (ex. PSG, Arsenal, Real Madrid)..."
            }
            aria-label={isEn ? "Search club" : "Rechercher un club"}
            className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 inline-flex items-center gap-1 text-xs font-medium text-fg-muted">
            <Filter className="h-3.5 w-3.5" aria-hidden="true" />
            {isEn ? "Confidence:" : "Indice IA :"}
          </span>
          {(
            [
              { id: "all", label: isEn ? "All" : "Tous" },
              { id: "medium", label: isEn ? "Medium+" : "Moyenne & +" },
              { id: "high", label: isEn ? "High only" : "Élevée" },
            ] as const
          ).map((opt) => (
            <Button
              key={opt.id}
              type="button"
              size="sm"
              variant={confidenceFilter === opt.id ? "primary" : "outline"}
              onClick={() => setConfidenceFilter(opt.id)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Match Cards Grid */}
      {filteredFixtures.length === 0 ? (
        <EmptyState
          icon={<CalendarRange className="h-6 w-6 text-fg-muted" />}
          title={
            isEn
              ? "No match matches your current filter"
              : "Aucune rencontre ne correspond à ce filtre"
          }
          description={
            isEn
              ? "Reset the league or confidence filter to view all analyzed fixtures."
              : "Réinitialisez le filtre de compétition ou de confiance pour afficher l'ensemble des rencontres analysées par BONUVO AI."
          }
          action={
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSelectedLeague("all");
                setConfidenceFilter("all");
                setQuery("");
              }}
            >
              {isEn ? "Reset filters" : "Réinitialiser les filtres"}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredFixtures.map((fix) => (
            <FixtureRow key={fix.id} fixture={fix} locale={locale} />
          ))}
        </div>
      )}
    </section>
  );
}
