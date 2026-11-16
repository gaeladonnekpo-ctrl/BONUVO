import { ArrowRight, Building2, Shield } from "lucide-react";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RatingScore } from "@/components/business/RatingScore";
import { UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/lib/i18n/config";
import { buildLocalizedMetadata } from "@/lib/i18n/metadata";
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
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {bookmakers.map((bm) => (
            <Card key={bm.id} className="flex flex-col justify-between">
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

                {bm.licenseSummary ? (
                  <p className="flex items-center gap-1.5 text-xs text-fg-muted">
                    <Shield className="h-3.5 w-3.5 shrink-0 text-trust" aria-hidden="true" />
                    <span>{bm.licenseSummary}</span>
                  </p>
                ) : null}

                {bm.paymentMethods.length > 0 ? (
                  <p className="text-xs text-fg-muted">
                    {bm.paymentMethods.map((p) => p.name).join(", ")}
                  </p>
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
          ))}
        </div>
      )}
    </div>
  );
}
