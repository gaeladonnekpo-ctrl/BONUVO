"use client";

import { Check, Scale } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";
import * as React from "react";
import { OfferCard } from "@/components/business/OfferCard";
import { UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { CompareTray } from "@/modules/offers/components/CompareTray";
import { CountryGate } from "@/modules/offers/components/CountryGate";
import { FilterBar } from "@/modules/offers/components/FilterBar";
import { offerCatalogQueryParsers } from "@/modules/offers/components/offer-query-parsers";
import { SortMenu } from "@/modules/offers/components/SortMenu";
import { filterAndRankOffers } from "@/modules/offers/public-mappers";
import type {
  PublicOfferListItem,
  PublicPaymentMethodSummary,
} from "@/modules/offers/public-types";

export interface OfferListProps {
  offers: readonly PublicOfferListItem[];
  countryCode: string;
  isCountryCovered: boolean;
  paymentMethods: readonly PublicPaymentMethodSummary[];
}

export function OfferList({
  offers,
  countryCode,
  isCountryCovered,
  paymentMethods,
}: OfferListProps) {
  const t = useTranslations("publicCatalog");
  const { pushToast } = useToast();
  const [query, setQuery] = useQueryStates(offerCatalogQueryParsers, {
    history: "replace",
    shallow: true,
  });

  const bookmakers = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const offer of offers) {
      if (!map.has(offer.bookmakerSlug)) {
        map.set(offer.bookmakerSlug, offer.bookmakerName);
      }
    }
    return Array.from(map.entries()).map(([slug, name]) => ({ slug, name }));
  }, [offers]);

  const visibleOffers = React.useMemo(() => {
    return filterAndRankOffers([...offers], {
      type: query.type,
      paiement: query.paiement || undefined,
      depotMax: query.depotMax ?? undefined,
      avecCode: query.avecCode,
      bookmaker: query.bookmaker || undefined,
      q: query.q,
      tri: query.tri,
    });
  }, [offers, query]);

  function handleReset() {
    void setQuery({
      type: "all",
      paiement: "",
      depotMax: null,
      avecCode: false,
      bookmaker: "",
      q: "",
      tri: "rank",
    });
  }

  function handleToggleCompare(slug: string) {
    const current = query.compare;
    if (current.includes(slug)) {
      void setQuery({ compare: current.filter((item) => item !== slug) });
      return;
    }
    if (current.length >= 3) {
      pushToast({ title: t("compareLimit"), tone: "warning" });
      return;
    }
    void setQuery({ compare: [...current, slug] });
  }

  if (offers.length === 0) {
    return <CountryGate countryCode={countryCode} isCovered={isCountryCovered} />;
  }

  return (
    <div className="space-y-6">
      <FilterBar
        search={query.q}
        offerType={query.type}
        payment={query.paiement}
        maxDeposit={query.depotMax}
        withCodeOnly={query.avecCode}
        bookmakerSlug={query.bookmaker}
        paymentMethods={paymentMethods}
        bookmakers={bookmakers}
        onSearchChange={(q) => void setQuery({ q })}
        onTypeChange={(type) => void setQuery({ type: type as typeof query.type })}
        onPaymentChange={(paiement) => void setQuery({ paiement })}
        onMaxDepositChange={(depotMax) => void setQuery({ depotMax })}
        onWithCodeChange={(avecCode) => void setQuery({ avecCode })}
        onBookmakerChange={(bookmaker) => void setQuery({ bookmaker })}
        onReset={handleReset}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <UiBadge tone="neutral">{t("resultsCount", { count: visibleOffers.length })}</UiBadge>
        <SortMenu value={query.tri} onChange={(tri) => void setQuery({ tri })} />
      </div>

      {visibleOffers.length === 0 ? (
        <EmptyState
          title={t("resultsCount", { count: 0 })}
          description={t("countryGateUnsupportedDescription")}
          action={
            <Button type="button" variant="outline" size="sm" onClick={handleReset}>
              {t("filterReset")}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {visibleOffers.map((offer) => {
            const isSelected = query.compare.includes(offer.offerSlug);
            return (
              <OfferCard
                key={offer.id}
                countryCode={countryCode}
                className={
                  isSelected
                    ? "ring-1 ring-accent/55 transition-[transform,opacity] duration-200 hover:-translate-y-0.5"
                    : "transition-[transform,opacity] duration-200 hover:-translate-y-0.5"
                }
                offer={{
                  ...offer,
                  detailHref: `/offres/${offer.offerSlug}`,
                }}
                headerAction={
                  <Button
                    type="button"
                    size="sm"
                    variant={isSelected ? "primary" : "outline"}
                    className="h-7 px-2.5 text-xs transition-transform duration-150 active:scale-[0.96]"
                    onClick={() => handleToggleCompare(offer.offerSlug)}
                  >
                    {isSelected ? (
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <Scale className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    <span>{isSelected ? t("compareAdded") : t("compareAdd")}</span>
                  </Button>
                }
              />
            );
          })}
        </div>
      )}

      <CompareTray
        selectedSlugs={query.compare}
        onRemoveSlug={(slug) =>
          void setQuery({ compare: query.compare.filter((item) => item !== slug) })
        }
        onClear={() => void setQuery({ compare: [] })}
      />
    </div>
  );
}
