import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AiResponsibilityNoticeProps {
  locale?: string;
  className?: string;
}

/**
 * Displays the BONUVO AI statistical probability & responsible gaming notice.
 */
export function AiResponsibilityNotice({ locale = "fr", className }: AiResponsibilityNoticeProps) {
  const isEn = locale === "en";

  return (
    <aside
      aria-label={isEn ? "Risk & probability notice" : "Avertissement de risque et responsabilité"}
      className={cn(
        "flex items-start gap-3 rounded-2xl border border-border/80 bg-surface-subtle/70 px-4 py-3 text-xs leading-relaxed text-fg-muted sm:px-5 sm:py-3.5 sm:text-[13px]",
        className,
      )}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
      <p>
        {isEn
          ? "Predictions and combined coupons suggested by BONUVO AI are generated from statistical analyses and available sports data. They represent probability estimates and never guarantee a win or certain profit. Sports betting carries a risk of loss. Play responsibly."
          : "Les pronostics et les coupons proposés par BONUVO AI sont générés à partir d'analyses statistiques et de données sportives disponibles. Ils constituent des estimations de probabilités et ne garantissent en aucun cas une victoire ou un gain certain. Les paris sportifs comportent des risques de perte. Jouez de manière responsable."}
      </p>
    </aside>
  );
}
