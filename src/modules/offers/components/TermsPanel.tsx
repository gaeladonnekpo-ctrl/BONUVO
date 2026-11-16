import { AlertCircle, CheckCircle2, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PublicOfferTermItem } from "@/modules/offers/public-types";

export interface TermsPanelProps {
  title: string;
  terms: readonly PublicOfferTermItem[];
  positiveHighlights: readonly string[];
  negativeHighlights: readonly string[];
  adultNotice: string;
}

export function TermsPanel({
  title,
  terms,
  positiveHighlights,
  negativeHighlights,
  adultNotice,
}: TermsPanelProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border bg-surface-subtle/60 pb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-accent" aria-hidden="true" />
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        <span className="rounded border border-border-strong px-2 py-0.5 font-mono text-xs font-semibold text-fg">
          {adultNotice}
        </span>
      </CardHeader>

      <CardContent className="space-y-5 pt-5">
        {positiveHighlights.length > 0 ? (
          <ul className="space-y-2 text-sm text-fg">
            {positiveHighlights.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-trust" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {negativeHighlights.length > 0 ? (
          <div className="space-y-2 rounded-lg border border-warning/30 bg-warning-soft p-3 text-xs text-warning">
            {negativeHighlights.map((item) => (
              <p key={item} className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item}</span>
              </p>
            ))}
          </div>
        ) : null}

        {terms.length > 0 ? (
          <dl className="divide-y divide-border rounded-lg border border-border bg-surface-subtle/40">
            {terms.map((term) => (
              <div key={term.id} className="space-y-1 p-3.5">
                <dt className="text-sm font-semibold text-fg">{term.title}</dt>
                <dd className="text-sm leading-relaxed text-fg-muted">{term.body}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </CardContent>
    </Card>
  );
}
