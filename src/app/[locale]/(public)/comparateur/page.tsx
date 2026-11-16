import { Scale } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/lib/i18n/config";
import { buildLocalizedMetadata } from "@/lib/i18n/metadata";
import { CompareTable } from "@/modules/offers/components/CompareTable";
import { PageViewTracker } from "@/modules/offers/components/PageViewTracker";
import { compareOffers, listOffers } from "@/modules/offers/public-service";
import { resolvePublicRequestCountry } from "@/server/geo/request-country";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const resolvedLocale: AppLocale = locale === "en" ? "en" : "fr";
  const t = await getTranslations({ locale: resolvedLocale, namespace: "publicCatalog" });

  return buildLocalizedMetadata({
    locale: resolvedLocale,
    pathname: "/comparateur",
    title: t("compareMetaTitle"),
    description: t("compareMetaDescription"),
  });
}

export default async function ComparatorPage({
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

  const rawSlugs = typeof sp.offres === "string" ? sp.offres.split(",").filter(Boolean) : [];
  const cleanSlugs = rawSlugs
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 3);

  const [t, { offers }, compared] = await Promise.all([
    getTranslations("publicCatalog"),
    listOffers({ countryCode, locale: resolvedLocale }),
    compareOffers({ slugs: cleanSlugs, countryCode, locale: resolvedLocale }),
  ]);

  const selectedOffers =
    compared.items.length >= 2
      ? compared.items
      : cleanSlugs.length === 0 && offers.length >= 2
        ? offers.slice(0, 2)
        : compared.items;

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <PageViewTracker path={`/${resolvedLocale}/comparateur`} countryCode={countryCode} />

      <header className="space-y-1.5 border-b border-border pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <Scale className="h-5 w-5 text-accent" aria-hidden="true" />
          <h1 className="font-display text-2xl font-bold text-fg sm:text-3xl">
            {t("compareMetaTitle").replace(" | BONUVO", "")}
          </h1>
        </div>
        <p className="text-sm text-fg-muted sm:text-base">{t("compareMetaDescription")}</p>
      </header>

      <CompareTable allOffers={offers} selectedOffers={selectedOffers} countryCode={countryCode} />
    </div>
  );
}
