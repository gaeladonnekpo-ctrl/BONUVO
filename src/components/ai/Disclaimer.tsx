import { AlertTriangle } from "lucide-react";

export interface DisclaimerProps {
  locale?: string;
}

export function Disclaimer({ locale = "fr" }: DisclaimerProps) {
  const isEn = locale === "en";

  return (
    <aside
      role="note"
      aria-label={
        isEn ? "Responsible statistical notice" : "Avertissement statistique et jeu responsable"
      }
      className="flex flex-col gap-2 rounded-xl border border-warning/40 bg-warning-soft/50 px-4 py-3 text-sm text-fg sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
        <p className="leading-snug text-fg-muted">
          {isEn
            ? "Probabilistic estimates computed from historical football statistics (Poisson model v1). Never guaranteed winnings — treat forecasts purely as informational insights."
            : "Estimations probabilistes calculées à partir des statistiques historiques (modèle Poisson v1). Aucun gain garanti — ces indicateurs ont une portée strictement informative."}
        </p>
      </div>
      <span className="inline-flex shrink-0 items-center self-start rounded-full border border-danger/40 bg-danger-soft px-2.5 py-0.5 text-xs font-bold text-danger sm:self-center">
        18+
      </span>
    </aside>
  );
}
