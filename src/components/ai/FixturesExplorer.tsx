"use client";

import * as React from "react";
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";
import { FixtureRow } from "@/components/ai/FixtureRow";
import { LeagueBadge } from "@/components/ai/SportCrest";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { LeagueFilterOption, PublicFixtureDto } from "@/modules/ai/service/public-ai-types";

export interface FixturesExplorerProps {
  fixtures: PublicFixtureDto[];
  leagues: LeagueFilterOption[];
  initialDateIso: string;
  initialLeagueId?: string;
  locale?: string;
}

const BIG_FIVE_NAMES = new Set(["premier league", "la liga", "serie a", "ligue 1", "bundesliga"]);

function shiftDateIso(dateIso: string, deltaDays: number): string {
  const [y, m, d] = dateIso.split("-").map((n) => Number.parseInt(n, 10));
  const dt = new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1, (d ?? 1) + deltaDays));
  return dt.toISOString().slice(0, 10);
}

function formatReadableDate(dateIso: string, isEn: boolean): string {
  const [y, m, d] = dateIso.split("-").map((n) => Number.parseInt(n, 10));
  const dt = new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1, d ?? 1, 12, 0, 0));
  return new Intl.DateTimeFormat(isEn ? "en-GB" : "fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(dt);
}

function formatShortChipDate(dateIso: string, isEn: boolean): { weekday: string; day: string } {
  const [y, m, d] = dateIso.split("-").map((n) => Number.parseInt(n, 10));
  const dt = new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1, d ?? 1, 12, 0, 0));
  const weekday = new Intl.DateTimeFormat(isEn ? "en-GB" : "fr-FR", {
    weekday: "short",
    timeZone: "UTC",
  }).format(dt);
  const day = new Intl.DateTimeFormat(isEn ? "en-GB" : "fr-FR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(dt);
  return { weekday, day };
}

export function FixturesExplorer({
  fixtures: initialFixtures,
  leagues: initialLeagues,
  initialDateIso,
  initialLeagueId,
  locale = "fr",
}: FixturesExplorerProps) {
  const isEn = locale === "en";
  const [selectedDate, setSelectedDate] = React.useState<string>(initialDateIso);
  const [fixtures, setFixtures] = React.useState<PublicFixtureDto[]>(initialFixtures);
  const [leagues, setLeagues] = React.useState<LeagueFilterOption[]>(initialLeagues);
  const [loading, setLoading] = React.useState(false);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [selectedLeague, setSelectedLeague] = React.useState<string>(initialLeagueId ?? "all");
  const [confidenceFilter, setConfidenceFilter] = React.useState<"all" | "high" | "medium">("all");
  const [query, setQuery] = React.useState("");
  const [showAllEmptyLeagues, setShowAllEmptyLeagues] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);

  const todayIso = React.useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const stripDates = React.useMemo(
    () => [-2, -1, 0, 1, 2, 3, 4].map((offset) => shiftDateIso(selectedDate, offset)),
    [selectedDate],
  );

  async function handleDateChange(nextDate: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDate)) return;
    setSelectedDate(nextDate);
    setFetchError(null);
    setLoading(true);

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("date", nextDate);
      window.history.replaceState({}, "", url.toString());
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const tz = -new Date().getTimezoneOffset();
      const res = await fetch(
        `/api/ai/fixtures?date=${encodeURIComponent(nextDate)}&tz=${encodeURIComponent(String(tz))}`,
        { signal: controller.signal, cache: "no-store" },
      );
      if (!res.ok) {
        throw new Error(`HTTP_${res.status}`);
      }
      const data = (await res.json()) as {
        fixtures: PublicFixtureDto[];
        leagues: LeagueFilterOption[];
      };
      setFixtures(data.fixtures);
      if (data.leagues.length > 0) setLeagues(data.leagues);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setFetchError(
          isEn
            ? "Unable to refresh matches for this date. Please try again."
            : "Impossible d'actualiser les rencontres pour cette date. Veuillez réessayer.",
        );
      }
    } finally {
      if (abortRef.current === controller) {
        setLoading(false);
      }
    }
  }

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
      if (confidenceFilter !== "all") {
        const primary = f.predictions.find((p) => p.market === "1x2") ?? f.predictions[0];
        if (!primary) return false;
        if (confidenceFilter === "high" && primary.confidenceLevel !== "high") return false;
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
  }, [fixtures, confidenceFilter, query]);

  const groupedSections = React.useMemo(() => {
    const byLeagueKey = new Map<string, PublicFixtureDto[]>();
    for (const f of filteredFixtures) {
      const key = f.leagueName.toLowerCase();
      const arr = byLeagueKey.get(key) ?? [];
      arr.push(f);
      byLeagueKey.set(key, arr);
    }

    const chosenLeague =
      selectedLeague === "all" ? null : (leagues.find((l) => l.id === selectedLeague) ?? null);

    return leagues
      .filter((l) => {
        if (chosenLeague) {
          return (
            l.id === chosenLeague.id || l.name.toLowerCase() === chosenLeague.name.toLowerCase()
          );
        }
        const items = byLeagueKey.get(l.name.toLowerCase()) ?? [];
        if (items.length > 0) return true;
        if (query.trim().length > 0) return false;
        return showAllEmptyLeagues || BIG_FIVE_NAMES.has(l.name.toLowerCase());
      })
      .map((l) => ({
        league: l,
        items: byLeagueKey.get(l.name.toLowerCase()) ?? [],
      }));
  }, [leagues, filteredFixtures, selectedLeague, query, showAllEmptyLeagues]);

  return (
    <section
      aria-label={
        isEn ? "Calendar, Competitions & AI Forecasts" : "Calendrier, Compétitions & Pronostics IA"
      }
      className="space-y-5"
    >
      {/* Interactive Calendar Bar */}
      <div className="space-y-3 rounded-2xl border border-border bg-surface p-3.5 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-accent" aria-hidden="true" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
                {isEn ? "Selected matchday" : "Date sélectionnée"}
              </p>
              <p className="font-display text-sm font-bold capitalize text-fg sm:text-base">
                {formatReadableDate(selectedDate, isEn)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleDateChange(shiftDateIso(todayIso, -1))}
              className="h-8 px-2.5 text-xs"
            >
              {isEn ? "Yesterday" : "Hier"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={selectedDate === todayIso ? "primary" : "outline"}
              onClick={() => handleDateChange(todayIso)}
              className="h-8 px-2.5 text-xs"
            >
              {isEn ? "Today" : "Aujourd'hui"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleDateChange(shiftDateIso(todayIso, 1))}
              className="h-8 px-2.5 text-xs"
            >
              {isEn ? "Tomorrow" : "Demain"}
            </Button>

            <label className="relative inline-flex items-center">
              <Calendar
                className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-accent"
                aria-hidden="true"
              />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                aria-label={isEn ? "Pick any date" : "Choisir une date"}
                className="h-8 rounded-lg border border-border bg-surface-subtle pl-8 pr-2 text-xs font-medium text-fg focus:border-accent focus:outline-none"
              />
            </label>
          </div>
        </div>

        {/* Swipeable 7-Day Ribbon */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleDateChange(shiftDateIso(selectedDate, -1))}
            aria-label={isEn ? "Previous day" : "Jour précédent"}
            className="flex h-12 w-8 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-subtle text-fg-muted hover:text-fg"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex flex-1 items-center gap-1.5 overflow-x-auto pb-0.5">
            {stripDates.map((dIso) => {
              const { weekday, day } = formatShortChipDate(dIso, isEn);
              const isSelected = dIso === selectedDate;
              return (
                <button
                  key={dIso}
                  type="button"
                  onClick={() => handleDateChange(dIso)}
                  className={`flex min-w-[78px] flex-1 flex-col items-center justify-center rounded-xl border px-2 py-1.5 text-center transition-all ${
                    isSelected
                      ? "border-accent bg-accent text-accent-fg shadow-xs"
                      : "border-border bg-surface-subtle/60 text-fg hover:border-border-strong"
                  }`}
                >
                  <span className="text-[10px] font-semibold uppercase opacity-80">{weekday}</span>
                  <span className="text-xs font-bold">{day}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => handleDateChange(shiftDateIso(selectedDate, 1))}
            aria-label={isEn ? "Next day" : "Jour suivant"}
            className="flex h-12 w-8 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-subtle text-fg-muted hover:text-fg"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Swipeable Competition Filter Carousel */}
      {leagues.length > 0 ? (
        <div
          role="navigation"
          aria-label={isEn ? "Filter by competition" : "Filtrer par compétition"}
          className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1"
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
                  name={`${l.name} (${count})`}
                  logoUrl={l.logoUrl}
                  active={isSelected}
                  className="cursor-pointer py-1.5 px-3 hover:border-accent/60"
                />
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Search, Confidence & Empty Competitions Toggle */}
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
                ? "Search club or competition (e.g. PSG, Bayern, Real Madrid)..."
                : "Rechercher un club ou une compétition (ex. PSG, Bayern, Real Madrid)..."
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
              className="h-8 rounded-full px-3 text-xs"
            >
              {opt.label}
            </Button>
          ))}

          {selectedLeague === "all" ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowAllEmptyLeagues((v) => !v)}
              className="h-8 text-xs text-fg-muted"
            >
              {showAllEmptyLeagues
                ? isEn
                  ? "Hide empty leagues"
                  : "Masquer ligues vides"
                : isEn
                  ? "Show all leagues"
                  : "Toutes les ligues"}
            </Button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface p-6 text-sm text-fg-muted">
          <Loader2 className="h-4 w-4 animate-spin text-accent" aria-hidden="true" />
          <span>
            {isEn
              ? "Synchronizing matches & BONUVO AI statistics for this date..."
              : "Synchronisation des matchs et analyses BONUVO AI pour cette date..."}
          </span>
        </div>
      ) : fetchError ? (
        <Card className="border-danger/40 bg-danger-soft/40">
          <CardContent className="pt-5 text-sm text-danger">{fetchError}</CardContent>
        </Card>
      ) : null}

      {/* Matches Grouped Automatically by Competition */}
      <div className="space-y-6">
        {groupedSections.map(({ league, items }) => (
          <div key={league.id} className="space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-border/70 pb-2">
              <div className="flex items-center gap-2.5">
                <LeagueBadge
                  name={league.name}
                  logoUrl={league.logoUrl}
                  countryName={league.countryName}
                />
                <span className="text-xs font-medium text-fg-muted">
                  {items.length}{" "}
                  {items.length > 1 ? (isEn ? "matches" : "matchs") : isEn ? "match" : "match"}
                </span>
              </div>
            </div>

            {items.length === 0 ? (
              <Card className="border-dashed bg-surface-subtle/30">
                <CardContent className="py-4 text-center text-sm text-fg-muted">
                  {isEn
                    ? "No matches available for this competition on this date."
                    : "Aucun match disponible pour cette compétition à cette date."}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {items.map((fix) => (
                  <FixtureRow key={fix.id} fixture={fix} locale={locale} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
