"use client";

import { ExternalLink, Scale, X } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import * as React from "react";
import { PaymentMethodList } from "@/components/business/PaymentMethodList";
import { PromoCodeBox } from "@/components/business/PromoCodeBox";
import { RatingScore } from "@/components/business/RatingScore";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { Link, useRouter } from "@/i18n/navigation";
import { trackPublicEvent } from "@/lib/events/track-public-event";
import type { PublicOfferListItem } from "@/modules/offers/public-types";

export interface CompareTableProps {
  allOffers: readonly PublicOfferListItem[];
  selectedOffers: readonly PublicOfferListItem[];
  countryCode: string;
}

export function CompareTable({ allOffers, selectedOffers, countryCode }: CompareTableProps) {
  const t = useTranslations("publicCatalog");
  const tCard = useTranslations("offerCard");
  const router = useRouter();
  const { pushToast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const urlSlugs = React.useMemo(
    () => selectedOffers.map((item) => item.offerSlug),
    [selectedOffers],
  );
  const [optimisticSlugs, setOptimisticSlugs] = React.useOptimistic(urlSlugs);

  const displayedOffers = React.useMemo(() => {
    const bySlug = new Map<string, PublicOfferListItem>();
    for (const item of [...allOffers, ...selectedOffers]) {
      if (!bySlug.has(item.offerSlug)) bySlug.set(item.offerSlug, item);
    }
    return optimisticSlugs
      .map((slug) => bySlug.get(slug))
      .filter((item): item is PublicOfferListItem => Boolean(item));
  }, [allOffers, selectedOffers, optimisticSlugs]);

  function toggleSlug(slug: string) {
    const exists = optimisticSlugs.includes(slug);
    if (!exists && optimisticSlugs.length >= 3) {
      pushToast({ title: t("compareLimit"), tone: "warning" });
      return;
    }
    const next = exists
      ? optimisticSlugs.filter((item) => item !== slug)
      : [...optimisticSlugs, slug].slice(0, 3);

    const qs = next.length > 0 ? `?offres=${encodeURIComponent(next.join(","))}` : "";
    startTransition(() => {
      setOptimisticSlugs(next);
      router.replace(`/comparateur${qs}`, { scroll: false });
    });
  }

  return (
    <div className="space-y-6">
      {allOffers.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-card border border-border bg-surface p-4">
          {allOffers.map((item) => {
            const active = optimisticSlugs.includes(item.offerSlug);
            return (
              <Button
                key={item.id}
                type="button"
                size="sm"
                variant={active ? "primary" : "outline"}
                className="transition-[transform,opacity] duration-150 hover:scale-[1.02] active:scale-[0.97]"
                onClick={() => toggleSlug(item.offerSlug)}
              >
                {item.bookmakerName} · {item.bonusAmountDisplay}
              </Button>
            );
          })}
        </div>
      ) : null}

      {displayedOffers.length < 2 ? (
        <div className="animate-bonuvo-panel">
          <EmptyState
            icon={<Scale className="h-5 w-5" aria-hidden="true" />}
            title={t("compareEmptyTitle")}
            description={t("compareEmptyDescription")}
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/offres">{t("countryGateLinkOffers")}</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div
          key={displayedOffers.map((o) => o.offerSlug).join("|")}
          className={`animate-bonuvo-panel overflow-x-auto rounded-card border border-border bg-surface shadow-[var(--shadow-card)] transition-opacity duration-200 ${
            isPending ? "opacity-85" : "opacity-100"
          }`}
        >
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-subtle/70">
                <th className="w-48 p-4 text-xs font-semibold tracking-wider text-fg-muted uppercase">
                  {t("compareRowBookmaker")}
                </th>
                {displayedOffers.map((item, idx) => (
                  <th
                    key={item.id}
                    style={{ animationDelay: `${idx * 45}ms` }}
                    className="animate-bonuvo-col p-4 align-top"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        {item.bookmakerLogoUrl ? (
                          <Image
                            src={item.bookmakerLogoUrl}
                            alt={item.bookmakerName}
                            width={32}
                            height={32}
                            className="h-8 w-8 shrink-0 rounded-full border border-border-strong bg-surface-elevated object-contain p-0.5"
                          />
                        ) : (
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface-elevated font-display text-[11px] font-bold text-accent">
                            {item.bookmakerShortName}
                          </span>
                        )}
                        <div className="min-w-0">
                          <Link
                            href={`/offres/${item.offerSlug}`}
                            className="block truncate font-display text-base font-bold text-fg hover:text-accent"
                          >
                            {item.bookmakerName}
                          </Link>
                          <p className="mt-0.5 text-xs font-normal text-fg-muted">
                            {item.bonusHeadline}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSlug(item.offerSlug)}
                        aria-label={item.bookmakerName}
                        className="rounded-full p-1 text-fg-muted transition-transform duration-150 hover:scale-110 hover:text-danger active:scale-95 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="p-4 font-semibold text-fg-muted">{t("compareRowNote")}</td>
                {displayedOffers.map((item, idx) => (
                  <td
                    key={item.id}
                    style={{ animationDelay: `${idx * 45}ms` }}
                    className="animate-bonuvo-col p-4"
                  >
                    <RatingScore score={item.ratingScore} max={10} />
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-semibold text-fg-muted">{t("compareRowBonus")}</td>
                {displayedOffers.map((item) => (
                  <td key={item.id} className="p-4 font-display text-base font-bold text-fg">
                    {item.bonusAmountDisplay}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-semibold text-fg-muted">{t("compareRowMinDeposit")}</td>
                {displayedOffers.map((item) => (
                  <td key={item.id} className="p-4 text-fg">
                    {item.minDepositNumber !== null
                      ? `${item.minDepositNumber} ${item.currencyCode}`
                      : "—"}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-semibold text-fg-muted">{t("compareRowRollover")}</td>
                {displayedOffers.map((item) => (
                  <td key={item.id} className="p-4 text-fg-muted">
                    {item.rolloverText || "—"}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-semibold text-fg-muted">{t("compareRowMinOdds")}</td>
                {displayedOffers.map((item) => (
                  <td key={item.id} className="p-4 font-mono text-fg">
                    {item.minOddsNumber !== null ? item.minOddsNumber.toFixed(2) : "—"}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-semibold text-fg-muted">{t("compareRowPayments")}</td>
                {displayedOffers.map((item) => (
                  <td key={item.id} className="p-4">
                    {item.paymentMethods.length > 0 ? (
                      <PaymentMethodList
                        items={item.paymentMethodItems}
                        fallbackNames={item.paymentMethods}
                        compact
                      />
                    ) : (
                      <span className="text-xs text-fg-muted">—</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-semibold text-fg-muted">{t("compareRowCode")}</td>
                {displayedOffers.map((item) => (
                  <td key={item.id} className="p-4">
                    {item.promoCode ? (
                      <PromoCodeBox
                        code={item.promoCode}
                        onCopy={() =>
                          trackPublicEvent({
                            eventType: "promo_copy",
                            path: "/comparateur",
                            offerId: item.id,
                            bookmakerId: item.bookmakerId,
                            promoCodeId: item.promoCodeId,
                            countryCode,
                          })
                        }
                      />
                    ) : (
                      "—"
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-semibold text-fg-muted">{t("compareRowVerified")}</td>
                {displayedOffers.map((item) => (
                  <td key={item.id} className="p-4 text-xs text-fg-muted">
                    {item.verifiedDateLabel ?? tCard("unverifiedDate")}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-semibold text-fg-muted">{t("compareRowAction")}</td>
                {displayedOffers.map((item) => (
                  <td key={item.id} className="p-4">
                    {item.ctaHref ? (
                      <Button asChild size="sm" className="w-full">
                        <a href={item.ctaHref} rel="sponsored nofollow noopener">
                          <span>{tCard("ctaLabel", { bookmaker: item.bookmakerName })}</span>
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>
                      </Button>
                    ) : (
                      <Button size="sm" className="w-full" disabled>
                        {tCard("ctaUnavailable")}
                      </Button>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
