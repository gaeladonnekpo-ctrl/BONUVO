import { Scale, ShieldCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/lib/i18n/config";
import { buildLocalizedMetadata } from "@/lib/i18n/metadata";
import { serializeSafeJsonLd } from "@/lib/seo/json-ld";
import { OfferList } from "@/modules/offers/components/OfferList";
import { PageViewTracker } from "@/modules/offers/components/PageViewTracker";
import { listOffers } from "@/modules/offers/public-service";
import { resolvePublicRequestCountry } from "@/server/geo/request-country";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const resolvedLocale: AppLocale = locale === "en" ? "en" : "fr";
  const t = await getTranslations({ locale: resolvedLocale, namespace: "publicCatalog" });

  return buildLocalizedMetadata({
    locale: resolvedLocale,
    pathname: "/offres",
    title: t("offersMetaTitle"),
    description: t("offersMetaDescription"),
  });
}

export default async function OffersCatalogPage({
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

  const [t, tHome, { offers, meta }] = await Promise.all([
    getTranslations("publicCatalog"),
    getTranslations("home"),
    listOffers({ countryCode, locale: resolvedLocale }),
  ]);

  const jsonLd = serializeSafeJsonLd({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: t("offersTitle"),
    numberOfItems: offers.length,
    itemListElement: offers.slice(0, 10).map((offer, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: `${offer.bookmakerName} — ${offer.bonusHeadline}`,
    })),
  });

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <PageViewTracker path={`/${resolvedLocale}/offres`} countryCode={countryCode} />

      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1.5">
          <h1 className="font-display text-2xl font-bold text-fg sm:text-3xl">
            {t("offersTitle")}
          </h1>
          <p className="text-sm text-fg-muted sm:text-base">{t("offersSubtitle")}</p>
        </div>

        <Button asChild variant="outline" size="sm">
          <Link href="/comparateur">
            <Scale className="h-4 w-4" aria-hidden="true" />
            <span>{t("homeCtaComparator")}</span>
          </Link>
        </Button>
      </header>

      <div className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-subtle p-3 text-xs leading-relaxed text-fg-muted">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-trust" aria-hidden="true" />
        <p>{tHome("disclosureBanner")}</p>
      </div>

      <section aria-labelledby="offers-list-sr-heading">
        <h2 id="offers-list-sr-heading" className="sr-only">
          {t("offersTitle")}
        </h2>
        <OfferList
          offers={offers}
          countryCode={countryCode}
          currencyCode={meta.currencyCode}
          isCountryCovered={meta.isCountryCovered}
          paymentMethods={meta.paymentMethods}
        />
      </section>
    </div>
  );
}
