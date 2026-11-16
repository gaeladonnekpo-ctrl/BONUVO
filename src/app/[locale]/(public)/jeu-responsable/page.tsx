import { getTranslations, setRequestLocale } from "next-intl/server";
import { TrustPageView } from "@/components/layout/TrustPageView";
import type { AppLocale } from "@/lib/i18n/config";
import { buildLocalizedMetadata } from "@/lib/i18n/metadata";

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
  return <TrustPageView pageKey="responsible" />;
}
