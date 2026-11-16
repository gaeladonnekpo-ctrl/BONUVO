import { AlertTriangle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OfferCard } from "@/components/business/OfferCard";
import { UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/lib/i18n/config";
import { buildLocalizedMetadata } from "@/lib/i18n/metadata";
import { serializeSafeJsonLd } from "@/lib/seo/json-ld";
import { PageViewTracker } from "@/modules/offers/components/PageViewTracker";
import { TermsPanel } from "@/modules/offers/components/TermsPanel";
import { getOffer } from "@/modules/offers/public-service";
import { resolvePublicRequestCountry } from "@/server/geo/request-country";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const resolvedLocale: AppLocale = locale === "en" ? "en" : "fr";
  const detail = await getOffer({ slug, countryCode: "GLOBAL", locale: resolvedLocale });

  if (!detail) {
    notFound();
  }

  return buildLocalizedMetadata({
    locale: resolvedLocale,
    pathname: `/offres/${slug}`,
    title: `${detail.offer.bookmakerName} — ${detail.offer.bonusHeadline} | BONUVO`,
    description: `${detail.offer.bonusAmountDisplay} · ${detail.offer.rolloverText || detail.offer.bonusHeadline}`,
  });
}

export default async function OfferDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ locale, slug }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const resolvedLocale: "fr" | "en" = locale === "en" ? "en" : "fr";
  const queryCountry = typeof sp.pays === "string" ? sp.pays : undefined;
  const countryCode = await resolvePublicRequestCountry(queryCountry);

  const [t, tCard, detail] = await Promise.all([
    getTranslations("publicCatalog"),
    getTranslations("offerCard"),
    getOffer({ slug, countryCode, locale: resolvedLocale }),
  ]);

  if (!detail) {
    notFound();
  }

  if (!detail.eligibleInCountry) {
    return (
      <div className="mx-auto max-w-[900px] space-y-6 px-4 py-10 sm:px-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/offres">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>{t("offersTitle")}</span>
          </Link>
        </Button>

        <EmptyState
          icon={<AlertTriangle className="h-6 w-6 text-warning" aria-hidden="true" />}
          title={t("offerIneligibleTitle", { country: detail.requestedCountryCode })}
          description={t("offerIneligibleDescription")}
          action={
            <div className="space-y-3 text-center">
              <p className="text-xs font-medium text-fg-muted">
                {t("offerIneligibleEligibleList")}{" "}
                {detail.eligibleCountries.map((c) => c.code).join(", ") || "—"}
              </p>
              <Button asChild variant="primary" size="sm">
                <Link href="/offres">{t("countryGateLinkOffers")}</Link>
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  const jsonLd = serializeSafeJsonLd({
    "@context": "https://schema.org",
    "@type": "Offer",
    name: `${detail.offer.bookmakerName} — ${detail.offer.bonusHeadline}`,
    priceCurrency: detail.offer.currencyCode,
    availability: "https://schema.org/InStock",
  });

  return (
    <div className="mx-auto max-w-[1100px] space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <PageViewTracker
        eventType="offer_view"
        path={`/${resolvedLocale}/offres/${slug}`}
        offerId={detail.offer.id}
        bookmakerId={detail.offer.bookmakerId}
        countryCode={countryCode}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/offres">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>{t("offersTitle")}</span>
          </Link>
        </Button>
        <div className="flex flex-wrap gap-1.5">
          {detail.eligibleCountries.map((country) => (
            <UiBadge key={country.code} tone="neutral">
              {country.code}
            </UiBadge>
          ))}
        </div>
      </div>

      <OfferCard offer={detail.offer} countryCode={countryCode} />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("offerDetailStepsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm text-fg">
            {[t("offerDetailStep1"), t("offerDetailStep2"), t("offerDetailStep3")].map(
              (step, idx) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 font-mono text-xs font-bold text-accent">
                    {idx + 1}
                  </span>
                  <span className="flex items-start gap-2 pt-0.5">
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-trust"
                      aria-hidden="true"
                    />
                    <span>{step}</span>
                  </span>
                </li>
              ),
            )}
          </ol>
        </CardContent>
      </Card>

      <TermsPanel
        title={t("offerDetailTermsTitle")}
        terms={detail.terms}
        positiveHighlights={detail.positiveHighlights}
        negativeHighlights={detail.negativeHighlights}
        adultNotice={tCard("adultNotice")}
      />

      {detail.neighboringOffers.length > 0 ? (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold text-fg">
            {t("offerDetailNeighborsTitle")}
          </h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {detail.neighboringOffers.map((item) => (
              <OfferCard
                key={item.id}
                countryCode={countryCode}
                offer={{ ...item, detailHref: `/offres/${item.offerSlug}` }}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
