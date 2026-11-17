import { ArrowRight, BookOpenCheck, ShieldCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { OfferCard } from "@/components/business/OfferCard";
import { PartnerLogoGrid } from "@/components/business/PartnerLogoGrid";
import { PromoCodeBox } from "@/components/business/PromoCodeBox";
import { TRUST_PAGE_LINKS } from "@/components/layout/navigation-links";
import { UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/lib/i18n/config";
import { buildLocalizedMetadata } from "@/lib/i18n/metadata";
import { serializeSafeJsonLd } from "@/lib/seo/json-ld";
import { CountryGate } from "@/modules/offers/components/CountryGate";
import { PageViewTracker } from "@/modules/offers/components/PageViewTracker";
import { listBookmakers, listOffers, listPromoCodes } from "@/modules/offers/public-service";
import { resolvePublicRequestCountry } from "@/server/geo/request-country";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const resolvedLocale: AppLocale = locale === "en" ? "en" : "fr";
  const tBrand = await getTranslations({ locale: resolvedLocale, namespace: "brand" });
  const tHome = await getTranslations({ locale: resolvedLocale, namespace: "home" });

  return buildLocalizedMetadata({
    locale: resolvedLocale,
    pathname: "/",
    title: tBrand("fullSignature"),
    description: tHome("heroDescription"),
  });
}

export default async function PublicHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const resolvedLocale: "fr" | "en" = locale === "en" ? "en" : "fr";

  const queryCountry = typeof sp.pays === "string" ? sp.pays : undefined;
  const countryCode = await resolvePublicRequestCountry(queryCountry);

  const [tBrand, tHome, tTrust, tCatalog, offersData, bookmakersData, promosData] =
    await Promise.all([
      getTranslations("brand"),
      getTranslations("home"),
      getTranslations("trustPages"),
      getTranslations("publicCatalog"),
      listOffers({ countryCode, locale: resolvedLocale }),
      listBookmakers(countryCode),
      listPromoCodes({ countryCode, locale: resolvedLocale }),
    ]);

  const topOffers = offersData.offers.slice(0, 4);
  const featuredPromo = promosData.codes[0] ?? null;
  const partnerItems = bookmakersData.bookmakers.slice(0, 8).map((bm) => ({
    id: bm.id,
    name: bm.name,
    shortCode: bm.shortCode,
    slug: bm.slug,
    logoUrl: bm.logoUrl,
    licenseSummary: bm.licenseSummary ?? undefined,
  }));

  const jsonLd = serializeSafeJsonLd({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "BONUVO",
    description: tHome("heroDescription"),
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://bonuvo.vercel.app"}/${resolvedLocale}`,
  });

  return (
    <div className="mx-auto max-w-[1200px] space-y-10 px-4 py-8 sm:space-y-12 sm:px-6 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <PageViewTracker path={`/${resolvedLocale}`} countryCode={countryCode} />

      <section className="rounded-card border border-border bg-surface p-6 shadow-[var(--shadow-card)] sm:p-10">
        <UiBadge tone="outline">{tHome("eyebrow")}</UiBadge>
        <div className="mt-5">
          <h1 aria-label={tBrand("name")} className="inline-block">
            <BrandLogo size="lg" decorative />
          </h1>
          <p className="mt-2 font-display text-xs font-medium tracking-[0.22em] text-brand-tagline uppercase sm:text-sm">
            {tBrand("fullSignature")}
          </p>
        </div>

        <h2 className="mt-6 max-w-3xl font-display text-2xl font-bold tracking-tight text-fg sm:text-3xl">
          {tHome("heroTitle")}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fg-muted sm:text-base">
          {tHome("heroDescription")}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="primary">
            <Link href="/offres">
              <span>{tCatalog("homeCtaOffers")}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/bookmakers">{tCatalog("homeCtaBookmakers")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/comparateur">{tCatalog("homeCtaComparator")}</Link>
          </Button>
        </div>

        <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-border bg-surface-subtle p-3.5 text-xs leading-relaxed text-fg-muted sm:text-sm">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-trust" aria-hidden="true" />
          <p>{tHome("disclosureBanner")}</p>
        </div>
      </section>

      <section id="offres" aria-labelledby="offers-section-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="offers-section-heading" className="font-display text-xl font-bold text-fg">
            {topOffers.length > 0 ? tCatalog("homeTopOffersTitle") : tHome("catalogEmptyTitle")}
          </h2>
          {topOffers.length > 0 ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/offres">
                <span>{tCatalog("homeCtaOffers")}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          ) : null}
        </div>

        {topOffers.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {topOffers.map((offer) => (
              <OfferCard
                key={offer.id}
                countryCode={countryCode}
                offer={{ ...offer, detailHref: `/offres/${offer.offerSlug}` }}
              />
            ))}
          </div>
        ) : countryCode !== "GLOBAL" ? (
          <CountryGate countryCode={countryCode} isCovered={offersData.meta.isCountryCovered} />
        ) : (
          <EmptyState
            icon={<BookOpenCheck className="h-5 w-5" aria-hidden="true" />}
            title={tHome("catalogEmptyTitle")}
            description={tHome("catalogEmptyDescription")}
            action={
              <Button asChild variant="primary">
                <Link href="/methodologie">
                  <span>{tHome("catalogEmptyAction")}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            }
          />
        )}
      </section>

      {featuredPromo ? (
        <section id="codes-promo" aria-labelledby="featured-code-heading" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id="featured-code-heading" className="font-display text-xl font-bold text-fg">
              {tCatalog("homeFeaturedCodeTitle")}
            </h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/codes-promo">{tCatalog("promoCodesTitle")}</Link>
            </Button>
          </div>
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-5">
              <div>
                <p className="font-display text-base font-bold text-fg">
                  {featuredPromo.bookmakerName}
                </p>
                {featuredPromo.description ? (
                  <p className="text-sm text-fg-muted">{featuredPromo.description}</p>
                ) : null}
              </div>
              <div className="w-full max-w-sm">
                <PromoCodeBox
                  code={featuredPromo.code}
                  validOn={featuredPromo.countryCode ?? undefined}
                />
              </div>
            </CardContent>
          </Card>
        </section>
      ) : (
        <div id="codes-promo" className="sr-only" />
      )}

      <section id="pronostics" aria-labelledby="ai-preview-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="ai-preview-heading" className="font-display text-xl font-bold text-fg">
            {resolvedLocale === "en" ? "AI Football Predictions" : "Pronostics IA Football"}
          </h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/pronostics">
              {resolvedLocale === "en" ? "All forecasts" : "Tous les pronostics"}
              <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-5">
            <p className="text-sm text-fg-muted">
              {resolvedLocale === "en"
                ? "Real-time probabilistic football forecasts, official club crests, combined coupons and verified track record."
                : "Pronostics football en temps réel, logos officiels, coupons combinés et historique vérifié."}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="primary" size="sm">
                <Link href="/pronostics">
                  {resolvedLocale === "en" ? "Explore forecasts" : "Découvrir les pronostics"}
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/pronostics/historique">
                  {resolvedLocale === "en" ? "Track record" : "Voir l'historique"}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section id="bookmakers" aria-labelledby="partners-section-heading" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="partners-section-heading" className="font-display text-xl font-bold text-fg">
            {partnerItems.length > 0 ? tCatalog("homePartnersTitle") : tHome("partnersEmptyTitle")}
          </h2>
          {partnerItems.length > 0 ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/bookmakers">{tCatalog("homeCtaBookmakers")}</Link>
            </Button>
          ) : null}
        </div>
        <PartnerLogoGrid
          items={partnerItems}
          state={partnerItems.length > 0 ? "content" : "empty"}
        />
      </section>

      <section id="communaute" aria-labelledby="trust-section-heading" className="space-y-5">
        <div className="space-y-1.5">
          <h2 id="trust-section-heading" className="font-display text-xl font-bold text-fg">
            {tHome("trustSectionTitle")}
          </h2>
          <p className="max-w-2xl text-sm text-fg-muted">{tHome("trustSectionDescription")}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_PAGE_LINKS.map((item) => (
            <Card key={item.key} className="flex flex-col justify-between">
              <CardHeader>
                <CardTitle className="text-base">{tTrust(`${item.key}.nav`)}</CardTitle>
                <CardDescription className="line-clamp-3">
                  {tTrust(`${item.key}.lead`)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" size="sm" className="w-full justify-between">
                  <Link href={item.href}>
                    <span>{tHome("readMore")}</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
