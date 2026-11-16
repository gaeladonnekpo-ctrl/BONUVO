"use client";

import { ArrowRight, Check, Scale, Shield } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import * as React from "react";
import { PaymentMethodList } from "@/components/business/PaymentMethodList";
import { RatingScore } from "@/components/business/RatingScore";
import { UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { Link } from "@/i18n/navigation";
import { CompareTray } from "@/modules/offers/components/CompareTray";
import type { PublicBookmakerListItem } from "@/modules/offers/public-types";

export interface BookmakerGridProps {
  bookmakers: readonly PublicBookmakerListItem[];
}

export function BookmakerGrid({ bookmakers }: BookmakerGridProps) {
  const t = useTranslations("publicCatalog");
  const { pushToast } = useToast();
  const [selectedSlugs, setSelectedSlugs] = React.useState<string[]>([]);

  function toggleCompare(offerSlug: string) {
    if (selectedSlugs.includes(offerSlug)) {
      setSelectedSlugs((prev) => prev.filter((item) => item !== offerSlug));
      return;
    }
    if (selectedSlugs.length >= 3) {
      pushToast({ title: t("compareLimit"), tone: "warning" });
      return;
    }
    setSelectedSlugs((prev) => [...prev, offerSlug]);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {bookmakers.map((bm) => {
          const offerSlug = bm.primaryOfferSlug ?? null;
          const isSelected = Boolean(offerSlug && selectedSlugs.includes(offerSlug));

          return (
            <Card
              key={bm.id}
              className={`flex flex-col justify-between transition-[transform,opacity] duration-200 hover:-translate-y-0.5 ${
                isSelected ? "ring-1 ring-accent/60" : ""
              }`}
            >
              <CardHeader className="gap-3 border-b border-border bg-surface-subtle/60 pb-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    {bm.logoUrl ? (
                      <Image
                        src={bm.logoUrl}
                        alt={bm.name}
                        width={44}
                        height={44}
                        className="h-11 w-11 shrink-0 rounded-full border border-border-strong bg-surface-elevated object-contain p-1"
                      />
                    ) : (
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface-elevated font-display text-xs font-bold text-accent">
                        {bm.shortCode}
                      </span>
                    )}
                    <CardTitle className="truncate text-lg">{bm.name}</CardTitle>
                  </div>
                  <RatingScore score={bm.finalScore} max={10} />
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pt-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    <UiBadge tone="neutral">
                      {t("bookmakerOffersCount", { count: bm.activeOffersCount })}
                    </UiBadge>
                    {bm.appPlatforms.map((platform) => (
                      <UiBadge key={platform} tone="outline" className="uppercase">
                        {platform}
                      </UiBadge>
                    ))}
                  </div>
                  {offerSlug ? (
                    <Button
                      type="button"
                      size="sm"
                      variant={isSelected ? "primary" : "outline"}
                      className="h-7 px-2.5 text-xs transition-transform duration-150 active:scale-[0.96]"
                      onClick={() => toggleCompare(offerSlug)}
                    >
                      {isSelected ? (
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <Scale className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span>{isSelected ? t("compareAdded") : t("compareAdd")}</span>
                    </Button>
                  ) : null}
                </div>

                {bm.licenseSummary ? (
                  <p className="flex items-center gap-1.5 text-xs text-fg-muted">
                    <Shield className="h-3.5 w-3.5 shrink-0 text-trust" aria-hidden="true" />
                    <span>{bm.licenseSummary}</span>
                  </p>
                ) : null}

                {bm.paymentMethods.length > 0 ? (
                  <PaymentMethodList items={bm.paymentMethods} maxVisible={6} compact />
                ) : null}
              </CardContent>

              <CardFooter>
                <Button asChild variant="outline" size="sm" className="w-full justify-between">
                  <Link href={`/bookmakers/${bm.slug}`}>
                    <span>{t("bookmakerViewProfile")}</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <CompareTray
        selectedSlugs={selectedSlugs}
        onRemoveSlug={(slug) => setSelectedSlugs((prev) => prev.filter((item) => item !== slug))}
        onClear={() => setSelectedSlugs([])}
      />
    </div>
  );
}
