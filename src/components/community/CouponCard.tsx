import { CheckCircle2, Clock, Ticket, Trophy, XCircle } from "lucide-react";
import type { PublicCouponItem } from "@/modules/community/service";

interface CouponCardProps {
  coupon: PublicCouponItem;
  locale: "fr" | "en";
}

export function CouponCard({ coupon, locale }: CouponCardProps) {
  const isFr = locale === "fr";
  const title = isFr ? coupon.titleFr : coupon.titleEn || coupon.titleFr;
  const description = isFr ? coupon.descriptionFr : coupon.descriptionEn || coupon.descriptionFr;
  const settlement = coupon.settlementStatus ?? "pending";

  return (
    <article className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-xs">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {settlement === "won" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-trust/40 bg-trust-soft px-3 py-1 text-xs font-semibold text-trust">
              <Trophy className="size-3.5" aria-hidden="true" />
              {isFr ? "Coupon gagnant" : "Winning coupon"}
            </span>
          ) : settlement === "lost" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-danger/30 bg-danger-soft px-3 py-1 text-xs font-semibold text-danger">
              <XCircle className="size-3.5" aria-hidden="true" />
              {isFr ? "Coupon manqué" : "Lost coupon"}
            </span>
          ) : settlement === "void" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-semibold text-fg-muted">
              {isFr ? "Annulé / Neutre" : "Void / Cancelled"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-semibold text-fg">
              <CheckCircle2 className="size-3.5 text-success" aria-hidden="true" />
              <Clock className="size-3 text-fg-muted" aria-hidden="true" />
              {isFr ? "Coupon validé · En cours" : "Validated · Pending"}
            </span>
          )}
          {coupon.combinedOdds ? (
            <span className="rounded-lg bg-surface-muted px-2.5 py-1 font-mono text-xs font-bold text-fg">
              {isFr ? "Cote" : "Odds"} {coupon.combinedOdds}
            </span>
          ) : null}
        </div>

        <h3 className="font-display text-lg font-bold tracking-tight text-fg">{title}</h3>

        {description ? (
          <p className="text-sm leading-relaxed text-fg-muted">{description}</p>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-muted/70 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <Ticket className="size-4 text-accent" aria-hidden="true" />
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-fg-muted">
              {coupon.bookmakerName || (isFr ? "Code coupon" : "Coupon code")}
            </p>
            <p className="font-mono text-sm font-bold text-fg">{coupon.couponCode || "BONUVO"}</p>
          </div>
        </div>
        <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-fg-muted">
          {coupon.countryCode}
        </span>
      </div>
    </article>
  );
}
