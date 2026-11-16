import { UiBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface AuditTimelineItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  actorId: string | null;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  createdAt: Date | string;
}

export interface AuditTimelineProps {
  title: string;
  emptyLabel: string;
  items: readonly AuditTimelineItem[];
  locale?: string;
}

export function AuditTimeline({ title, emptyLabel, items, locale = "fr" }: AuditTimelineProps) {
  const formatter = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-fg-muted">{emptyLabel}</p>
        ) : (
          <ol className="space-y-3">
            {items.map((item) => {
              const dt = item.createdAt instanceof Date ? item.createdAt : new Date(item.createdAt);
              return (
                <li key={item.id} className="rounded-lg border border-border bg-surface-subtle p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <UiBadge tone="accent">{item.action}</UiBadge>
                      <span className="text-xs text-fg-muted">{item.entityType}</span>
                    </div>
                    <time dateTime={dt.toISOString()} className="text-xs text-fg-muted">
                      {formatter.format(dt)}
                    </time>
                  </div>
                  {item.afterState ? (
                    <pre className="mt-2 overflow-x-auto rounded bg-surface p-2 text-[11px] text-fg-muted">
                      {JSON.stringify(item.afterState, null, 2)}
                    </pre>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
