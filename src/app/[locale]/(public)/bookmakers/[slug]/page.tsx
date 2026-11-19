import { AlertTriangle, ArrowLeft, Shield } from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OfferCard } from "@/components/business/OfferCard";
import { PaymentMethodList } from "@/components/business/PaymentMethodList";
import { RatingScore } from "@/components/business/RatingScore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/lib/i18n/config";
import { buildLocalizedMetadata } from "@/lib/i18n/metadata";
import { PageViewTracker } from "@/modules/offers/components/PageViewTracker";
import { getBookmaker } from "@/modules/offers/public-service";
import { resolvePublicRequestCountry } from "@/server/geo/request-country";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const resolvedLocale: AppLocale = locale === "en" ? "en" : "fr";
  const detail = await getBookmaker({ slug, countryCode: "GLOBAL", locale: resolvedLocale });

  if (!detail) {
    notFound();
  }

  return buildLocalizedMetadata({
    locale: resolvedLocale,
    pathname: `/bookmakers/${slug}`,
    title: `${detail.bookmaker.name} — Avis & Bonus | BONUVO`,
    description:
      detail.bookmaker.description ||
      `${detail.bookmaker.name} — BONUVO: SMART OFFERS. BETTER CHOICES.`,
  });
}

export default async function BookmakerDetailPage({
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

  const [t, detail] = await Promise.all([
    getTranslations("publicCatalog"),
    getBookmaker({ slug, countryCode, locale: resolvedLocale }),
  ]);

  if (!detail) {
    notFound();
  }

  if (!detail.eligibleInCountry) {
    return (
      <div className="mx-auto max-w-[900px] space-y-6 px-4 py-10 sm:px-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/bookmakers">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>{t("bookmakersTitle")}</span>
          </Link>
        </Button>
        <EmptyState
          icon={<AlertTriangle className="h-6 w-6 text-warning" aria-hidden="true" />}
          title={t("offerIneligibleTitle", { country: detail.requestedCountryCode })}
          description={t("offerIneligibleDescription")}
          action={
            <Button asChild variant="primary" size="sm">
              <Link href="/bookmakers">{t("bookmakersTitle")}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const criteria = detail.rating
    ? [
        { label: t("bookmakerScoreBonus"), score: detail.rating.bonusScore },
        { label: t("bookmakerScorePayments"), score: detail.rating.paymentsScore },
        { label: t("bookmakerScoreOdds"), score: detail.rating.oddsScore },
        { label: t("bookmakerScoreApp"), score: detail.rating.appScore },
        { label: t("bookmakerScoreSupport"), score: detail.rating.supportScore },
      ]
    : [];

  return (
    <div className="mx-auto max-w-[1100px] space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      <PageViewTracker
        path={`/${resolvedLocale}/bookmakers/${slug}`}
        bookmakerId={detail.bookmaker.id}
        countryCode={countryCode}
      />

      <Button asChild variant="ghost" size="sm">
        <Link href="/bookmakers">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>{t("bookmakersTitle")}</span>
        </Link>
      </Button>

      <section className="rounded-card border border-border bg-surface p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {detail.bookmaker.logoUrl ? (
              <Image
                src={detail.bookmaker.logoUrl}
                alt={detail.bookmaker.name}
                width={56}
                height={56}
                className="h-14 w-14 rounded-full border border-border-strong bg-surface-elevated object-contain p-1"
              />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-border-strong bg-surface-elevated font-display text-base font-bold text-accent">
                {detail.bookmaker.shortCode}
              </span>
            )}
            <div>
              <h1 className="font-display text-2xl font-bold text-fg sm:text-3xl">
                {detail.bookmaker.name}
              </h1>
              {detail.bookmaker.foundedYear ? (
                <p className="text-xs text-fg-muted">{detail.bookmaker.foundedYear}</p>
              ) : null}
            </div>
          </div>

          <RatingScore score={detail.bookmaker.finalScore} max={10} />
        </div>

        {detail.bookmaker.description ? (
          <p className="mt-4 text-sm leading-relaxed text-fg-muted">
            {detail.bookmaker.description}
          </p>
        ) : null}
      </section>

      {detail.rating ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("bookmakerScoreTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {criteria.map((row) => (
              <div key={row.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-fg-muted">{row.label}</span>
                  <span className="font-mono font-bold text-fg">{row.score.toFixed(1)} / 10</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-subtle">
                  <div
                    className="h-full rounded-full bg-trust"
                    style={{ width: `${Math.min(100, (row.score / 10) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("operatorLicenseTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-lg border border-border bg-surface-subtle/50 p-3">
              <div className="flex items-start gap-2">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-trust" aria-hidden="true" />
                <div className="space-y-1">
                  <p className="font-semibold text-fg">
                    {detail.bookmaker.operatorLicenseNumber || "—"}
                  </p>
                  {detail.bookmaker.operatorLicenseAuthority ? (
                    <p className="text-xs text-fg-muted">
                      {detail.bookmaker.operatorLicenseAuthority}
                    </p>
                  ) : null}
                  <p className="text-[11px] text-fg-muted">{t("operatorLicenseNote")}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <h3 className="text-sm font-semibold text-fg">{t("offeredCountriesTitle")}</h3>
              {detail.countryLicenses.map((item) => {
                const localNum = item.localLicense.trim();
                const localAuth = item.authorityName.trim();
                const verifiedLocal = localNum && localAuth ? `${localNum} · ${localAuth}` : null;
                return (
                  <div
                    key={item.countryCode}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface-subtle/50 p-3"
                  >
                    <span className="font-semibold text-fg">
                      {resolvedLocale === "en" ? item.countryNameEn : item.countryNameFr}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
                      {verifiedLocal ? (
                        <>
                          <Shield className="h-3.5 w-3.5 text-trust" aria-hidden="true" />
                          <span>{t("localAuthLabel", { license: verifiedLocal })}</span>
                        </>
                      ) : (
                        <span>{t("noLocalAuthLabel")}</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("bookmakerPaymentsTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            {detail.paymentMethods.length > 0 ? (
              <PaymentMethodList items={detail.paymentMethods} showDeposit />
            ) : (
              <p className="text-sm text-fg-muted">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      {detail.activeOffers.length > 0 ? (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold text-fg">{t("offersTitle")}</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {detail.activeOffers.map((offer) => (
              <OfferCard
                key={offer.id}
                countryCode={countryCode}
                offer={{ ...offer, detailHref: `/offres/${offer.offerSlug}` }}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
