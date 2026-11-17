import { TicketPercent } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/lib/i18n/config";
import { buildLocalizedMetadata } from "@/lib/i18n/metadata";
import { PageViewTracker } from "@/modules/offers/components/PageViewTracker";
import { PromoCodesCatalog } from "@/modules/offers/components/PromoCodesCatalog";
import { listPromoCodes } from "@/modules/offers/public-service";
import { resolvePublicRequestCountry } from "@/server/geo/request-country";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const resolvedLocale: AppLocale = locale === "en" ? "en" : "fr";
  const t = await getTranslations({ locale: resolvedLocale, namespace: "publicCatalog" });

  return buildLocalizedMetadata({
    locale: resolvedLocale,
    pathname: "/codes-promo",
    title: t("promoCodesMetaTitle"),
    description: t("promoCodesMetaDescription"),
  });
}

export default async function PromoCodesPage({
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

  const [t, { codes }] = await Promise.all([
    getTranslations("publicCatalog"),
    listPromoCodes({ countryCode, locale: resolvedLocale }),
  ]);

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <PageViewTracker path={`/${resolvedLocale}/codes-promo`} countryCode={countryCode} />

      <header className="space-y-1.5 border-b border-border pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <TicketPercent className="h-5 w-5 text-accent" aria-hidden="true" />
          <h1 className="font-display text-2xl font-bold text-fg sm:text-3xl">
            {t("promoCodesTitle")}
          </h1>
        </div>
        <p className="text-sm text-fg-muted sm:text-base">{t("promoCodesSubtitle")}</p>
      </header>

      <PromoCodesCatalog codes={codes} countryCode={countryCode} />
    </div>
  );
}
