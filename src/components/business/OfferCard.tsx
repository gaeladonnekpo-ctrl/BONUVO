"use client";

import { AlertCircle, CalendarCheck2, Check, ExternalLink, FileText, Shield } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Badge } from "@/components/business/Badge";
import { PromoCodeBox } from "@/components/business/PromoCodeBox";
import { RatingScore } from "@/components/business/RatingScore";
import type { DataComponentState, OfferCardData } from "@/components/business/types";
import { Link } from "@/i18n/navigation";
import { trackPublicEvent } from "@/lib/events/track-public-event";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { UiBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface OfferCardProps {
  offer?: OfferCardData | null;
  state?: DataComponentState;
  emptyTitle?: string;
  emptyDescription?: string;
  onRetry?: () => void;
  countryCode?: string;
  headerAction?: ReactNode;
  className?: string;
}

function OfferCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("overflow-hidden", className)} aria-busy="true">
      <CardHeader className="gap-3">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-11 w-full" />
      </CardContent>
    </Card>
  );
}

/**
 * Core 7-zone BONUVO offer card enforcing verified dates, 18+ notice, and single primary CTA.
 */
export function OfferCard({
  offer,
  state = offer ? "content" : "empty",
  emptyTitle,
  emptyDescription,
  onRetry,
  countryCode,
  headerAction,
  className,
}: OfferCardProps) {
  const t = useTranslations("offerCard");
  const tStates = useTranslations("states");
  const tShowcase = useTranslations("designShowcase");

  if (state === "loading") {
    return <OfferCardSkeleton className={className} />;
  }

  if (state === "error") {
    return (
      <ErrorState
        title={t("errorTitle")}
        description={t("errorDescription")}
        retryLabel={tStates("retry")}
        onRetry={onRetry}
        className={className}
      />
    );
  }

  if (state === "empty" || !offer) {
    return (
      <EmptyState
        title={emptyTitle ?? t("emptyTitle")}
        description={emptyDescription ?? t("emptyDescription")}
        className={className}
      />
    );
  }

  const isClickableCta =
    Boolean(offer.ctaHref) &&
    (offer.ctaHref!.startsWith("/") || offer.ctaHref!.startsWith("https://"));

  function handlePromoCopy() {
    if (offer?.isDevExample || typeof window === "undefined" || !offer) return;
    trackPublicEvent({
      eventType: "promo_copy",
      path: window.location.pathname,
      offerId: offer.id,
      bookmakerId: offer.bookmakerId ?? null,
      promoCodeId: offer.promoCodeId ?? null,
      countryCode,
    });
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="gap-3 border-b border-border bg-surface-subtle/60 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {offer.rank !== undefined ? (
              <UiBadge tone="neutral" className="font-mono font-bold">
                {t("rankLabel", { rank: offer.rank })}
              </UiBadge>
            ) : null}
            {offer.badges?.map((tone) => (
              <Badge key={tone} tone={tone} />
            ))}
            {offer.isDevExample ? (
              <UiBadge tone="warning">{tShowcase("sampleBadge")}</UiBadge>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {headerAction}
            <RatingScore score={offer.ratingScore} max={offer.ratingMax ?? 5} />
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          {offer.bookmakerLogoUrl ? (
            <Image
              src={offer.bookmakerLogoUrl}
              alt={offer.bookmakerName}
              width={48}
              height={48}
              className="h-12 w-12 shrink-0 rounded-full border border-border-strong bg-surface-elevated object-contain p-1"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface-elevated font-display text-sm font-bold text-accent"
            >
              {offer.bookmakerShortName}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="truncate font-display text-lg font-bold text-fg">
              {offer.bookmakerName}
            </h3>
            {offer.detailHref ? (
              <Link
                href={offer.detailHref}
                className="text-sm font-medium text-fg-muted underline-offset-4 hover:text-accent hover:underline"
              >
                {offer.bonusHeadline}
              </Link>
            ) : (
              <p className="text-sm font-medium text-fg-muted">{offer.bonusHeadline}</p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-5">
        <div className="rounded-lg border border-border bg-surface-elevated/60 p-3.5">
          <p className="font-display text-xl font-bold text-fg sm:text-2xl">
            {offer.bonusAmountDisplay}
          </p>
        </div>

        {offer.highlights.length > 0 ? (
          <ul aria-label={t("strengthsLabel")} className="space-y-2 text-sm text-fg">
            {offer.highlights.slice(0, 4).map((point) => (
              <li key={point} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-trust" aria-hidden="true" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {offer.weaknessNote ? (
          <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-xs text-warning">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              <strong className="font-semibold">{t("weaknessLabel")}:</strong> {offer.weaknessNote}
            </span>
          </div>
        ) : null}

        {offer.rolloverText || offer.paymentMethods.length > 0 ? (
          <div className="flex flex-wrap gap-2 text-xs text-fg-muted">
            {offer.rolloverText ? (
              <span className="rounded-md border border-border bg-surface-subtle px-2.5 py-1">
                {t("rolloverLabel")}: <strong className="text-fg">{offer.rolloverText}</strong>
              </span>
            ) : null}
            {offer.paymentMethods.length > 0 ? (
              <span className="rounded-md border border-border bg-surface-subtle px-2.5 py-1">
                {t("paymentsLabel")}:{" "}
                <strong className="text-fg">{offer.paymentMethods.join(", ")}</strong>
              </span>
            ) : null}
          </div>
        ) : null}

        {offer.promoCode ? (
          <PromoCodeBox
            code={offer.promoCode}
            validOn={offer.promoValidOn}
            onCopy={handlePromoCopy}
          />
        ) : null}

        {isClickableCta && offer.ctaHref ? (
          <Button asChild size="lg" className="w-full">
            <a
              href={offer.ctaHref}
              target={offer.ctaHref.startsWith("https://") ? "_blank" : undefined}
              rel="sponsored nofollow noopener"
            >
              <span>{t("ctaLabel", { bookmaker: offer.bookmakerName })}</span>
              <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
            </a>
          </Button>
        ) : (
          <Button size="lg" className="w-full" disabled>
            <span>
              {offer.isDevExample
                ? t("ctaLabel", { bookmaker: offer.bookmakerName })
                : t("ctaUnavailable")}
            </span>
          </Button>
        )}
      </CardContent>

      <CardFooter className="bg-surface-subtle/50 text-xs text-fg-muted">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {offer.verifiedDateLabel ? (
            <span className="inline-flex items-center gap-1 text-trust">
              <CalendarCheck2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t("verifiedOn", { date: offer.verifiedDateLabel })}</span>
            </span>
          ) : (
            <span>{t("unverifiedDate")}</span>
          )}
          {offer.licenseLabel ? (
            <span className="inline-flex items-center gap-1">
              <Shield className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t("licenseLabel", { license: offer.licenseLabel })}</span>
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          {offer.termsSummary ? (
            <Dialog>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 font-medium text-fg underline underline-offset-4 hover:text-accent cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t("termsTrigger")}</span>
                </button>
              </DialogTrigger>
              <DialogContent closeLabel={t("termsDialogClose")}>
                <DialogHeader>
                  <DialogTitle>
                    {t("termsDialogTitle", { bookmaker: offer.bookmakerName })}
                  </DialogTitle>
                  <DialogDescription>{offer.bonusHeadline}</DialogDescription>
                </DialogHeader>
                <div className="mt-3 space-y-2 text-sm leading-relaxed text-fg-muted">
                  <p>{offer.termsSummary}</p>
                </div>
              </DialogContent>
            </Dialog>
          ) : null}
          <span className="rounded border border-border-strong px-1.5 py-0.5 font-mono text-[11px] font-semibold text-fg">
            {t("adultNotice")}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}
