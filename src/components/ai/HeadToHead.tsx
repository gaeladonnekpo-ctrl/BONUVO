import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface HeadToHeadItem {
  id: string;
  kickoffAt: string;
  homeTeamName: string;
  awayTeamName: string;
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {isEn ? "Recent Head-to-Head" : "Confrontations directes récentes"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-fg-muted">
            {isEn
              ? "No previous finished fixture recorded between these teams yet."
              : "Aucune confrontation terminée enregistrée dans la base actuelle."}
          </p>
        ) : (
          <ul className="divide-y divide-border/70 text-sm">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5"
              >
                <span className="text-xs text-fg-muted">
                  {new Date(item.kickoffAt).toISOString().slice(0, 10)}
                </span>
                <span className="font-medium text-fg">
                  {item.homeTeamName}{" "}
                  <strong className="mx-1 text-accent">
                    {item.homeGoals ?? "-"} - {item.awayGoals ?? "-"}
                  </strong>{" "}
                  {item.awayTeamName}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
