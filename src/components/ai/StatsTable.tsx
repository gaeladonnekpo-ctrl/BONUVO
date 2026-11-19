import { Flame } from "lucide-react";
import { PlayerAvatar } from "@/components/ai/PlayerAvatar";
import { UiBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TeamKeyPlayerStat, TeamRecentMatchStat } from "@/modules/ai/providers/types";

export interface TeamStatsSummary {
  matchesPlayed: number;
  goalsForTotal: number;
  goalsAgainstTotal: number;
  homeMatchesPlayed: number;
  homeGoalsFor: number;
  homeGoalsAgainst: number;
  awayMatchesPlayed: number;
  awayGoalsFor: number;
  awayGoalsAgainst: number;
  recentFormMatches: number;
  recentFormPoints: number;
  keyPlayersJson?: TeamKeyPlayerStat[];
  recentMatchesJson?: TeamRecentMatchStat[];
}

export interface StatsTableProps {
  homeTeamName: string;
  awayTeamName: string;
  homeStats: TeamStatsSummary | null;
  awayStats: TeamStatsSummary | null;
  locale?: string;
}

export function StatsTable({
  homeTeamName,
  awayTeamName,
  homeStats,
  awayStats,
  locale = "fr",
}: StatsTableProps) {
  const isEn = locale === "en";

  const rows: Array<{
    label: string;
    homeValue: string;
    awayValue: string;
  }> = [
    {
      label: isEn ? "Matches played" : "Matchs joués",
      homeValue: homeStats ? String(homeStats.matchesPlayed) : "—",
      awayValue: awayStats ? String(awayStats.matchesPlayed) : "—",
    },
    {
      label: isEn ? "Goals scored / conceded" : "Buts marqués / encaissés",
      homeValue: homeStats ? `${homeStats.goalsForTotal} / ${homeStats.goalsAgainstTotal}` : "—",
      awayValue: awayStats ? `${awayStats.goalsForTotal} / ${awayStats.goalsAgainstTotal}` : "—",
    },
    {
      label: isEn ? "Home / Away split goals" : "Bilan dom. / ext.",
      homeValue: homeStats
        ? `${homeStats.homeGoalsFor}:${homeStats.homeGoalsAgainst} (${homeStats.homeMatchesPlayed})`
        : "—",
      awayValue: awayStats
        ? `${awayStats.awayGoalsFor}:${awayStats.awayGoalsAgainst} (${awayStats.awayMatchesPlayed})`
        : "—",
    },
    {
      label: isEn ? "Recent form points" : "Points forme récente",
      homeValue:
        homeStats && homeStats.recentFormMatches > 0
          ? `${homeStats.recentFormPoints} / ${homeStats.recentFormMatches * 3}`
          : "—",
      awayValue:
        awayStats && awayStats.recentFormMatches > 0
          ? `${awayStats.recentFormPoints} / ${awayStats.recentFormMatches * 3}`
          : "—",
    },
  ];

  const homePlayers = homeStats?.keyPlayersJson ?? [];
  const awayPlayers = awayStats?.keyPlayersJson ?? [];
  const homeRecent = homeStats?.recentMatchesJson ?? [];
  const awayRecent = awayStats?.recentMatchesJson ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {isEn ? "Teams & Key Players Snapshot" : "Statistiques équipes & joueurs clés"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-fg-muted">
              <th className="py-2 pr-3 font-medium">{isEn ? "Metric" : "Indicateur"}</th>
              <th className="py-2 px-3 font-medium">{homeTeamName}</th>
              <th className="py-2 pl-3 font-medium">{awayTeamName}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-border/60 last:border-b-0">
                <td className="py-2.5 pr-3 text-fg-muted">{r.label}</td>
                <td className="py-2.5 px-3 font-semibold text-fg">{r.homeValue}</td>
                <td className="py-2.5 pl-3 font-semibold text-fg">{r.awayValue}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {homePlayers.length > 0 || awayPlayers.length > 0 ? (
          <div className="grid gap-5 border-t border-border pt-5 sm:grid-cols-2">
            {[
              { team: homeTeamName, players: homePlayers },
              { team: awayTeamName, players: awayPlayers },
            ].map((side) => (
              <div key={side.team} className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-fg-muted">
                    {isEn ? `Key players · ${side.team}` : `Joueurs clés · ${side.team}`}
                  </p>
                  <span className="text-[11px] font-medium text-fg-muted">
                    {side.players.length > 0
                      ? `${side.players.length} ${isEn ? "featured" : "suivis"}`
                      : ""}
                  </span>
                </div>
                {side.players.length === 0 ? (
                  <p className="text-xs text-fg-muted">—</p>
                ) : (
                  <ul className="space-y-2.5">
                    {side.players.map((p, idx) => {
                      const isTopScorer = idx === 0 && p.goals > 0;
                      return (
                        <li
                          key={`${side.team}-${p.name}`}
                          className="group/player flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-surface-subtle/60 p-2.5 transition-all duration-200 hover:border-accent/50 hover:bg-surface-elevated"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <PlayerAvatar
                              name={p.name}
                              photoUrl={p.photoUrl}
                              highlight={isTopScorer}
                            />
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="truncate font-display text-sm font-bold text-fg">
                                  {p.name}
                                </span>
                                {p.position ? (
                                  <UiBadge tone="outline" className="px-1.5 py-0 text-[10px]">
                                    {p.position}
                                  </UiBadge>
                                ) : null}
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-fg-muted">
                                {isTopScorer ? (
                                  <span className="inline-flex items-center gap-0.5 font-semibold text-accent">
                                    <Flame className="h-3 w-3" aria-hidden="true" />
                                    {isEn ? "Top scorer" : "Top buteur"}
                                  </span>
                                ) : null}
                                {isTopScorer ? <span>·</span> : null}
                                <span>{side.team}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                            <span className="rounded-lg bg-accent/10 px-2 py-0.5 font-mono text-xs font-bold text-accent">
                              {p.goals} {isEn ? "G" : "buts"}
                            </span>
                            <span className="font-mono text-[11px] text-fg-muted">
                              {p.appearances} {isEn ? "M" : "m."}
                              {p.assists > 0 ? ` · ${p.assists} ${isEn ? "A" : "pd"}` : ""}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>
        ) : null}

        {homeRecent.length > 0 || awayRecent.length > 0 ? (
          <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
            {[
              { team: homeTeamName, matches: homeRecent },
              { team: awayTeamName, matches: awayRecent },
            ].map((side) => (
              <div key={`${side.team}-recent`} className="space-y-1.5">
                <p className="text-xs font-semibold uppercase text-fg-muted">
                  {isEn ? `Last matches · ${side.team}` : `Forme récente · ${side.team}`}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {side.matches.map((m, idx) => (
                    <span
                      key={`${m.date}-${idx}`}
                      title={`${m.date} ${m.opponent} (${m.score})`}
                      className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold ${
                        m.result === "W"
                          ? "bg-trust-soft text-trust"
                          : m.result === "L"
                            ? "bg-danger-soft text-danger"
                            : "bg-surface-elevated text-fg-muted"
                      }`}
                    >
                      {m.result} {m.score}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
