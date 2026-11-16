"use client";

import { ExternalLink, Search, TicketPercent } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { parseAsString, useQueryState } from "nuqs";
import * as React from "react";
import { PromoCodeBox } from "@/components/business/PromoCodeBox";
import { UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { trackPublicEvent } from "@/lib/events/track-public-event";
import type { PublicPromoCodeItem } from "@/modules/offers/public-types";

export interface PromoCodesCatalogProps {
  codes: readonly PublicPromoCodeItem[];
  countryCode: string;
}

export function PromoCodesCatalog({ codes, countryCode }: PromoCodesCatalogProps) {
  const t = useTranslations("publicCatalog");
  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));

  const filtered = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return codes;
    return codes.filter((item) =>
      `${item.code} ${item.bookmakerName} ${item.description}`.toLowerCase().includes(needle),
    );
  }, [codes, search]);

  if (codes.length === 0) {
    return (
      <EmptyState
        icon={<TicketPercent className="h-5 w-5" aria-hidden="true" />}
        title={t("promoCodesEmptyTitle")}
        description={t("promoCodesEmptyDescription")}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="relative max-w-md">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-fg-muted"
          aria-hidden="true"
        />
        <Input
          value={search}
          onChange={(e) => void setSearch(e.target.value)}
          placeholder={t("filterSearchPlaceholder")}
          aria-label={t("filterSearchLabel")}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={t("promoCodesEmptyTitle")}
          description={t("promoCodesEmptyDescription")}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((item) => (
            <Card key={item.id}>
              <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border bg-surface-subtle/60 pb-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  {item.bookmakerLogoUrl ? (
                    <Image
                      src={item.bookmakerLogoUrl}
                      alt={item.bookmakerName}
                      width={40}
                      height={40}
                      className="h-10 w-10 shrink-0 rounded-full border border-border-strong bg-surface-elevated object-contain p-0.5"
                    />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface-elevated font-display text-xs font-bold text-accent">
                      {item.bookmakerShortCode}
                    </span>
                  )}
                  <div className="min-w-0">
                    <Link
                      href={`/bookmakers/${item.bookmakerSlug}`}
                      className="truncate font-display text-base font-bold text-fg hover:text-accent"
                    >
                      {item.bookmakerName}
                    </Link>
                    {item.description ? (
                      <p className="truncate text-xs text-fg-muted">{item.description}</p>
                    ) : null}
                  </div>
                </div>
                {item.countryCode ? <UiBadge tone="neutral">{item.countryCode}</UiBadge> : null}
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                <PromoCodeBox
                  code={item.code}
                  validOn={item.countryCode ?? undefined}
                  onCopy={() =>
                    trackPublicEvent({
                      eventType: "promo_copy",
                      path: "/codes-promo",
                      offerId: item.offerId,
                      bookmakerId: item.bookmakerId,
                      promoCodeId: item.id,
                      countryCode,
                    })
                  }
                />
                {item.ctaHref ? (
                  <Button asChild size="sm" className="w-full">
                    <a href={item.ctaHref} rel="sponsored nofollow noopener">
                      <span>{t("promoGoToPartner", { bookmaker: item.bookmakerName })}</span>
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
