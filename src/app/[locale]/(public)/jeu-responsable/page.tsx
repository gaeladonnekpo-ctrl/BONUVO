import { getTranslations, setRequestLocale } from "next-intl/server";
import { PartnerSupportCenter } from "@/components/layout/PartnerSupportCenter";
import { TrustPageView } from "@/components/layout/TrustPageView";
import type { AppLocale } from "@/lib/i18n/config";
import { buildLocalizedMetadata } from "@/lib/i18n/metadata";
import { listBookmakers } from "@/modules/offers/public-service";
import { resolvePublicRequestCountry } from "@/server/geo/request-country";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const resolvedLocale: AppLocale = locale === "en" ? "en" : "fr";
  const t = await getTranslations({
    locale: resolvedLocale,
    namespace: "trustPages.responsible",
  });
  return buildLocalizedMetadata({
    locale: resolvedLocale,
    pathname: "/jeu-responsable",
    title: `${t("title")} — BONUVO`,
    description: t("lead"),
  });
}

export default async function ResponsibleGamblingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const logosBySlug: Record<string, string | null> = {};
  const shortCodesBySlug: Record<string, string> = {};

  try {
    const countryCode = await resolvePublicRequestCountry();
    const { bookmakers } = await listBookmakers(countryCode);
    for (const bm of bookmakers) {
      logosBySlug[bm.slug] = bm.logoUrl;
      shortCodesBySlug[bm.slug] = bm.shortCode;
    }
  } catch {
    // Fallback gracefully to shortCode monograms if catalog lookup is unavailable.
  }

  return (
    <TrustPageView pageKey="responsible">
      <PartnerSupportCenter
        locale={locale}
        logosBySlug={logosBySlug}
        shortCodesBySlug={shortCodesBySlug}
      />
    </TrustPageView>
  );
}
