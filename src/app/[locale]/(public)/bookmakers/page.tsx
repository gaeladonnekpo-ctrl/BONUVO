import { Building2 } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/lib/i18n/config";
import { buildLocalizedMetadata } from "@/lib/i18n/metadata";
import { BookmakerGrid } from "@/modules/offers/components/BookmakerGrid";
import { CountryGate } from "@/modules/offers/components/CountryGate";
import { PageViewTracker } from "@/modules/offers/components/PageViewTracker";
import { listBookmakers } from "@/modules/offers/public-service";
import { resolvePublicRequestCountry } from "@/server/geo/request-country";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const resolvedLocale: AppLocale = locale === "en" ? "en" : "fr";
  const t = await getTranslations({ locale: resolvedLocale, namespace: "publicCatalog" });

  return buildLocalizedMetadata({
    locale: resolvedLocale,
    pathname: "/bookmakers",
    title: t("bookmakersMetaTitle"),
    description: t("bookmakersMetaDescription"),
  });
}

export default async function BookmakersDirectoryPage({
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

  const [t, { bookmakers, meta }] = await Promise.all([
    getTranslations("publicCatalog"),
    listBookmakers(countryCode),
  ]);

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <PageViewTracker path={`/${resolvedLocale}/bookmakers`} countryCode={countryCode} />

      <header className="space-y-1.5 border-b border-border pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <Building2 className="h-5 w-5 text-accent" aria-hidden="true" />
          <h1 className="font-display text-2xl font-bold text-fg sm:text-3xl">
            {t("bookmakersTitle")}
          </h1>
        </div>
        <p className="text-sm text-fg-muted sm:text-base">{t("bookmakersSubtitle")}</p>
      </header>

      {bookmakers.length === 0 ? (
        <CountryGate countryCode={countryCode} isCovered={meta.isCountryCovered} />
      ) : (
        <BookmakerGrid bookmakers={bookmakers} />
      )}
    </div>
  );
}
