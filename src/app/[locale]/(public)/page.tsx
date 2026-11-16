import { ArrowRight, BookOpenCheck, ShieldCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { PartnerLogoGrid } from "@/components/business/PartnerLogoGrid";
import { TRUST_PAGE_LINKS } from "@/components/layout/navigation-links";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { UiBadge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/lib/i18n/config";
import { buildLocalizedMetadata } from "@/lib/i18n/metadata";

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

export default async function PublicHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tBrand = await getTranslations("brand");
  const tHome = await getTranslations("home");
  const tTrust = await getTranslations("trustPages");

  return (
    <div className="mx-auto max-w-[1200px] space-y-10 px-4 py-8 sm:space-y-12 sm:px-6 sm:py-12">
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

        <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-border bg-surface-subtle p-3.5 text-xs leading-relaxed text-fg-muted sm:text-sm">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-trust" aria-hidden="true" />
          <p>{tHome("disclosureBanner")}</p>
        </div>
      </section>

      <section id="offres" aria-labelledby="offers-section-heading" className="space-y-4">
        <div id="codes-promo" className="sr-only" />
        <div id="pronostics" className="sr-only" />
        <div className="flex items-center justify-between gap-3">
          <h2 id="offers-section-heading" className="font-display text-xl font-bold text-fg">
            {tHome("catalogEmptyTitle")}
          </h2>
        </div>

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
      </section>

      <section id="bookmakers" aria-labelledby="partners-section-heading" className="space-y-4">
        <h2 id="partners-section-heading" className="font-display text-xl font-bold text-fg">
          {tHome("partnersEmptyTitle")}
        </h2>
        <PartnerLogoGrid items={[]} state="empty" />
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
