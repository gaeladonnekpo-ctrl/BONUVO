import { TeamCrest } from "@/components/ai/SportCrest";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface HeadToHeadItem {
  id: string;
  kickoffAt: string;
  homeTeamName: string;
  homeTeamLogo?: string;
  awayTeamName: string;
  awayTeamLogo?: string;
  homeGoals: number | null;
  awayGoals: number | null;
}

export interface HeadToHeadProps {
  items: HeadToHeadItem[];
  locale?: string;
}

export function HeadToHead({ items, locale = "fr" }: HeadToHeadProps) {
  const isEn = locale === "en";

  return (
    <Card className="border-border/90">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {isEn ? "Recent Head-to-Head" : "Confrontations directes récentes (H2H)"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="rounded-xl border border-border/60 bg-surface-subtle/50 p-4 text-sm text-fg-muted">
            {isEn
              ? "No previous finished fixture recorded between these teams yet."
              : "Aucune confrontation terminée enregistrée dans la saison courante."}
          </p>
        ) : (
          <ul className="space-y-2.5 text-sm">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 rounded-xl border border-border/70 bg-surface-subtle/60 p-3 transition-colors hover:border-border-strong sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-mono text-xs text-fg-muted">
                  {new Date(item.kickoffAt).toISOString().slice(0, 10)}
                </span>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs sm:text-sm">
                  <div className="flex items-center justify-end gap-1.5 text-right">
                    <span className="truncate font-semibold text-fg">{item.homeTeamName}</span>
                    <TeamCrest name={item.homeTeamName} logoUrl={item.homeTeamLogo} size="sm" />
                  </div>
                  <strong className="rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-0.5 font-mono text-xs font-bold text-accent">
                    {item.homeGoals ?? "-"} : {item.awayGoals ?? "-"}
                  </strong>
                  <div className="flex items-center gap-1.5 text-left">
                    <TeamCrest name={item.awayTeamName} logoUrl={item.awayTeamLogo} size="sm" />
                    <span className="truncate font-semibold text-fg">{item.awayTeamName}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
