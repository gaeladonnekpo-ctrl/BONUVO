import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {isEn ? "Statistical Snapshot" : "Instantané statistique de saison"}
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
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
      </CardContent>
    </Card>
  );
}
