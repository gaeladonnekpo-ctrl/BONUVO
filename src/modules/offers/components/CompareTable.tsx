"use client";

import { ExternalLink, Scale } from "lucide-react";
import { useTranslations } from "next-intl";
import { PromoCodeBox } from "@/components/business/PromoCodeBox";
import { RatingScore } from "@/components/business/RatingScore";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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

  function toggleSlug(slug: string) {
    const activeSlugs = selectedOffers.map((item) => item.offerSlug);
    const next = activeSlugs.includes(slug)
      ? activeSlugs.filter((item) => item !== slug)
      : [...activeSlugs, slug].slice(0, 3);

    const qs = next.length > 0 ? `?offres=${encodeURIComponent(next.join(","))}` : "";
    router.replace(`/comparateur${qs}`);
  }

  return (
    <div className="space-y-6">
      {allOffers.length > 0 ? (
        <div className="flex flex-wrap gap-2 rounded-card border border-border bg-surface p-4">
          {allOffers.map((item) => {
            const active = selectedOffers.some((sel) => sel.offerSlug === item.offerSlug);
            return (
              <Button
                key={item.id}
                type="button"
                size="sm"
                variant={active ? "primary" : "outline"}
                onClick={() => toggleSlug(item.offerSlug)}
              >
                {item.bookmakerName} · {item.bonusAmountDisplay}
              </Button>
            );
          })}
        </div>
      ) : null}

      {selectedOffers.length < 2 ? (
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
      ) : (
        <div className="overflow-x-auto rounded-card border border-border bg-surface shadow-[var(--shadow-card)]">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-subtle/70">
                <th className="w-48 p-4 text-xs font-semibold tracking-wider text-fg-muted uppercase">
                  {t("compareRowBookmaker")}
                </th>
                {selectedOffers.map((item) => (
                  <th key={item.id} className="p-4">
                    <Link
                      href={`/offres/${item.offerSlug}`}
                      className="font-display text-base font-bold text-fg hover:text-accent"
                    >
                      {item.bookmakerName}
                    </Link>
                    <p className="mt-0.5 text-xs font-normal text-fg-muted">{item.bonusHeadline}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="p-4 font-semibold text-fg-muted">{t("compareRowNote")}</td>
                {selectedOffers.map((item) => (
                  <td key={item.id} className="p-4">
                    <RatingScore score={item.ratingScore} max={10} />
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-semibold text-fg-muted">{t("compareRowBonus")}</td>
                {selectedOffers.map((item) => (
                  <td key={item.id} className="p-4 font-display text-base font-bold text-fg">
                    {item.bonusAmountDisplay}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-semibold text-fg-muted">{t("compareRowMinDeposit")}</td>
                {selectedOffers.map((item) => (
                  <td key={item.id} className="p-4 text-fg">
                    {item.minDepositNumber !== null
                      ? `${item.minDepositNumber} ${item.currencyCode}`
                      : "—"}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-semibold text-fg-muted">{t("compareRowRollover")}</td>
                {selectedOffers.map((item) => (
                  <td key={item.id} className="p-4 text-fg-muted">
                    {item.rolloverText || "—"}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-semibold text-fg-muted">{t("compareRowMinOdds")}</td>
                {selectedOffers.map((item) => (
                  <td key={item.id} className="p-4 font-mono text-fg">
                    {item.minOddsNumber !== null ? item.minOddsNumber.toFixed(2) : "—"}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-semibold text-fg-muted">{t("compareRowPayments")}</td>
                {selectedOffers.map((item) => (
                  <td key={item.id} className="p-4 text-xs text-fg-muted">
                    {item.paymentMethods.length > 0 ? item.paymentMethods.join(", ") : "—"}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-semibold text-fg-muted">{t("compareRowCode")}</td>
                {selectedOffers.map((item) => (
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
                {selectedOffers.map((item) => (
                  <td key={item.id} className="p-4 text-xs text-fg-muted">
                    {item.verifiedDateLabel ?? tCard("unverifiedDate")}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-semibold text-fg-muted">{t("compareRowAction")}</td>
                {selectedOffers.map((item) => (
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
