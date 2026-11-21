"use client";

import * as React from "react";
import {
  Calendar,
  Download,
  Image as ImageIcon,
  Loader2,
  Moon,
  RefreshCw,
  Sparkles,
  Sun,
} from "lucide-react";
import {
  exportPosterFromCanvas,
  renderMatchPosterToCanvas,
} from "@/components/ai/match-poster-renderer";
import { LeagueBadge } from "@/components/ai/SportCrest";
import { UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  computePosterLayout,
  POSTER_DIMENSIONS,
  type PosterAspectRatio,
  type PosterExportFormat,
  type PosterTheme,
} from "@/modules/ai/model/match-poster-layout";
import type { LeagueFilterOption, PublicFixtureDto } from "@/modules/ai/service/public-ai-types";

export interface MatchPosterStudioProps {
  initialDateIso: string;
  initialFixtures: PublicFixtureDto[];
  initialLeagues: LeagueFilterOption[];
  initialLeagueId?: string;
  locale?: string;
  siteUrl?: string;
}

function shiftDateIso(dateIso: string, deltaDays: number): string {
  const [y, m, d] = dateIso.split("-").map((n) => Number.parseInt(n, 10));
  const dt = new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1, (d ?? 1) + deltaDays));
  return dt.toISOString().slice(0, 10);
}

export function MatchPosterStudio({
  initialDateIso,
  initialFixtures,
  initialLeagues,
  initialLeagueId,
  locale = "fr",
  siteUrl = "https://www.bonuvofr.com",
}: MatchPosterStudioProps) {
  const isEn = locale === "en";
  const [selectedDate, setSelectedDate] = React.useState(initialDateIso);
  const [fixtures, setFixtures] = React.useState<PublicFixtureDto[]>(initialFixtures);
  const [leagues, setLeagues] = React.useState<LeagueFilterOption[]>(initialLeagues);
  const [selectedLeagueId, setSelectedLeagueId] = React.useState<string>(() => {
    if (initialLeagueId && initialLeagues.some((l) => l.id === initialLeagueId)) {
      return initialLeagueId;
    }
    const firstWithMatches = initialLeagues.find((l) =>
      initialFixtures.some((f) => f.leagueName.toLowerCase() === l.name.toLowerCase()),
    );
    return firstWithMatches?.id ?? initialLeagues[0]?.id ?? "";
  });
  const [ratio, setRatio] = React.useState<PosterAspectRatio>("4:5");
  const [theme, setTheme] = React.useState<PosterTheme>("dark");
  const [format, setFormat] = React.useState<PosterExportFormat>("png");
  const [syncingDate, setSyncingDate] = React.useState(false);
  const [rendering, setRendering] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  const todayIso = React.useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const selectedLeague = leagues.find((l) => l.id === selectedLeagueId) ?? leagues[0] ?? null;

  const leagueFixtures = React.useMemo(() => {
    if (!selectedLeague) return [];
    return fixtures.filter(
      (f) =>
        f.leagueId === selectedLeague.id ||
        f.leagueName.toLowerCase() === selectedLeague.name.toLowerCase(),
    );
  }, [fixtures, selectedLeague]);

  const layoutPlan = React.useMemo(
    () => computePosterLayout({ ratio, matchCount: leagueFixtures.length }),
    [ratio, leagueFixtures.length],
  );

  const generatePoster = React.useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedLeague || leagueFixtures.length === 0) return;
    setRendering(true);
    setErrorMsg(null);
    try {
      await renderMatchPosterToCanvas(canvas, {
        dateIso: selectedDate,
        league: selectedLeague,
        fixtures: leagueFixtures,
        ratio,
        theme,
        siteUrl,
        locale,
      });
    } catch {
      setErrorMsg(
        isEn
          ? "Unable to render poster preview. Please try again."
          : "Impossible de générer l'aperçu du visuel. Veuillez réessayer.",
      );
    } finally {
      setRendering(false);
    }
  }, [selectedDate, selectedLeague, leagueFixtures, ratio, theme, siteUrl, locale, isEn]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedLeague || leagueFixtures.length === 0) return;
    let cancelled = false;
    void renderMatchPosterToCanvas(canvas, {
      dateIso: selectedDate,
      league: selectedLeague,
      fixtures: leagueFixtures,
      ratio,
      theme,
      siteUrl,
      locale,
    })
      .then(() => {
        if (!cancelled) setErrorMsg(null);
      })
      .catch(() => {
        if (!cancelled) {
          setErrorMsg(
            isEn
              ? "Unable to render poster preview. Please try again."
              : "Impossible de générer l'aperçu du visuel. Veuillez réessayer.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDate, selectedLeague, leagueFixtures, ratio, theme, siteUrl, locale, isEn]);

  async function handleDateChange(nextDate: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDate)) return;
    setSelectedDate(nextDate);
    setSyncingDate(true);
    setErrorMsg(null);

    try {
      const tz = -new Date().getTimezoneOffset();
      const res = await fetch(
        `/api/ai/fixtures?date=${encodeURIComponent(nextDate)}&tz=${encodeURIComponent(String(tz))}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("SYNC_FAILED");
      const data = (await res.json()) as {
        fixtures: PublicFixtureDto[];
        leagues: LeagueFilterOption[];
      };
      setFixtures(data.fixtures);
      if (data.leagues.length > 0) setLeagues(data.leagues);
    } catch {
      setErrorMsg(
        isEn
          ? "Failed to fetch fixtures for this date."
          : "Impossible de récupérer les matchs pour cette date.",
      );
    } finally {
      setSyncingDate(false);
    }
  }

  async function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas || !selectedLeague || leagueFixtures.length === 0) return;
    setDownloading(true);
    setErrorMsg(null);
    try {
      const slug = selectedLeague.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      await exportPosterFromCanvas(canvas, {
        format,
        filenameBase: `bonuvo-${slug}-${selectedDate}-${ratio.replace(":", "x")}-${theme}`,
      });
    } catch {
      setErrorMsg(
        isEn
          ? "Download failed in this browser. Try PNG or JPG."
          : "Échec du téléchargement. Essayez le format PNG ou JPG.",
      );
    } finally {
      setDownloading(false);
    }
  }

  const leagueCounts = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const f of fixtures) {
      const k = f.leagueName.toLowerCase();
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [fixtures]);

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Left Controls Panel */}
      <div className="space-y-4 lg:col-span-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-accent" aria-hidden="true" />
              {isEn ? "1. Date & Competition" : "1. Date & Compétition"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleDateChange(shiftDateIso(todayIso, -1))}
              >
                {isEn ? "Yesterday" : "Hier"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={selectedDate === todayIso ? "primary" : "outline"}
                onClick={() => handleDateChange(todayIso)}
              >
                {isEn ? "Today" : "Aujourd'hui"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleDateChange(shiftDateIso(todayIso, 1))}
              >
                {isEn ? "Tomorrow" : "Demain"}
              </Button>
            </div>

            <label className="block space-y-1.5 text-xs font-semibold text-fg">
              <span>{isEn ? "Calendar date" : "Date du programme"}</span>
              <div className="relative">
                <Calendar
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent"
                  aria-hidden="true"
                />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-bg pl-9 pr-3 text-sm text-fg focus:border-accent focus:outline-none"
                />
              </div>
            </label>

            <label className="block space-y-1.5 text-xs font-semibold text-fg">
              <span>{isEn ? "Competition" : "Compétition / Ligue"}</span>
              <select
                value={selectedLeague?.id ?? ""}
                onChange={(e) => setSelectedLeagueId(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-bg px-3 text-sm text-fg focus:border-accent focus:outline-none"
              >
                {leagues.map((l) => {
                  const count = leagueCounts.get(l.name.toLowerCase()) ?? 0;
                  return (
                    <option key={l.id} value={l.id}>
                      {l.name} ({count} {count > 1 ? (isEn ? "matches" : "matchs") : "match"})
                    </option>
                  );
                })}
              </select>
            </label>

            {syncingDate ? (
              <p className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" aria-hidden="true" />
                {isEn ? "Synchronizing live matches..." : "Synchronisation des matchs en cours..."}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ImageIcon className="h-4 w-4 text-trust" aria-hidden="true" />
              {isEn ? "2. Dimensions & Export Format" : "2. Dimensions & Format d'export"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(POSTER_DIMENSIONS) as PosterAspectRatio[]).map((key) => {
                const dim = POSTER_DIMENSIONS[key];
                const active = ratio === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setRatio(key)}
                    className={`rounded-xl border p-2.5 text-left transition-all ${
                      active
                        ? "border-accent bg-accent/10 text-fg ring-1 ring-accent"
                        : "border-border bg-surface-subtle/60 text-fg-muted hover:border-border-strong"
                    }`}
                  >
                    <p className="text-xs font-bold text-fg">{isEn ? dim.labelEn : dim.labelFr}</p>
                    <p className="text-[11px] font-mono">
                      {dim.width}×{dim.height}
                    </p>
                    <p className="mt-0.5 text-[10px] opacity-80">
                      {isEn ? dim.usageEn : dim.usageFr}
                    </p>
                  </button>
                );
              })}
            </div>

            {layoutPlan.recommendedRatio ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-warning/40 bg-warning-soft/50 px-3 py-2 text-xs text-fg">
                <span>
                  {isEn
                    ? `${leagueFixtures.length} matches selected: ${layoutPlan.recommendedRatio} gives more breathing room.`
                    : `${leagueFixtures.length} matchs : le format ${layoutPlan.recommendedRatio} offre plus d'espace.`}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setRatio(layoutPlan.recommendedRatio!)}
                  className="h-7 shrink-0 px-2 text-[11px]"
                >
                  {layoutPlan.recommendedRatio}
                </Button>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-fg">
                {isEn ? "Visual theme" : "Thème du visuel"}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={theme === "dark" ? "primary" : "outline"}
                  onClick={() => setTheme("dark")}
                  className="gap-1.5"
                >
                  <Moon className="h-3.5 w-3.5" aria-hidden="true" />
                  {isEn ? "Dark" : "Sombre"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={theme === "light" ? "primary" : "outline"}
                  onClick={() => setTheme("light")}
                  className="gap-1.5"
                >
                  <Sun className="h-3.5 w-3.5" aria-hidden="true" />
                  {isEn ? "Light" : "Clair"}
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-fg">
                {isEn ? "Download format" : "Format de fichier"}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {(["png", "jpeg", "webp", "pdf"] as PosterExportFormat[]).map((fmt) => (
                  <Button
                    key={fmt}
                    type="button"
                    size="sm"
                    variant={format === fmt ? "primary" : "outline"}
                    onClick={() => setFormat(fmt)}
                    className="uppercase"
                  >
                    {fmt === "jpeg" ? "JPG" : fmt}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => void generatePoster()}
                disabled={rendering || leagueFixtures.length === 0}
                className="flex-1"
              >
                <RefreshCw
                  className={`mr-1.5 h-4 w-4 ${rendering ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                {isEn ? "Regenerate" : "Régénérer"}
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => void handleDownload()}
                disabled={downloading || rendering || leagueFixtures.length === 0}
                className="flex-1"
              >
                <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
                {downloading
                  ? isEn
                    ? "Exporting..."
                    : "Export..."
                  : `${isEn ? "Download" : "Télécharger"} ${format === "jpeg" ? "JPG" : format.toUpperCase()}`}
              </Button>
            </div>

            {errorMsg ? <p className="text-xs font-medium text-danger">{errorMsg}</p> : null}
          </CardContent>
        </Card>
      </div>

      {/* Right Live Preview Panel */}
      <div className="space-y-4 lg:col-span-7">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <div className="flex items-center gap-2">
              {selectedLeague ? (
                <LeagueBadge
                  name={selectedLeague.name}
                  logoUrl={selectedLeague.logoUrl}
                  countryName={selectedLeague.countryName}
                />
              ) : null}
              <UiBadge tone="trust">
                {leagueFixtures.length}{" "}
                {leagueFixtures.length > 1 ? (isEn ? "matches" : "matchs") : "match"}
              </UiBadge>
            </div>
            <span className="font-mono text-xs text-fg-muted">
              {POSTER_DIMENSIONS[ratio].width}×{POSTER_DIMENSIONS[ratio].height}
            </span>
          </CardHeader>

          <CardContent>
            {leagueFixtures.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-surface-subtle/40 px-4 py-12 text-center text-sm text-fg-muted">
                {isEn
                  ? "No matches available for this competition on this date. Select another date or competition."
                  : "Aucun match disponible pour cette compétition à cette date. Choisissez une autre date ou une autre compétition."}
              </div>
            ) : (
              <div className="relative flex justify-center rounded-2xl border border-border bg-bg p-3">
                <canvas
                  ref={canvasRef}
                  className="max-h-[680px] w-auto max-w-full rounded-xl shadow-lg"
                />
                {rendering ? (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-bg/60 backdrop-blur-xs">
                    <Loader2 className="h-6 w-6 animate-spin text-accent" />
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
