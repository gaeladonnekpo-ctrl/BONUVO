import { setRequestLocale } from "next-intl/server";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { getAdminDashboardData } from "@/modules/admin/service";
import { requireAdminAccess } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export default async function AdminCatalogHubPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const actor = await requireAdminAccess(locale, "offers.read");
  const { counts } = await getAdminDashboardData(actor);

  const sections = [
    {
      title: "Bookmakers",
      count: `${counts.bookmakersActive} actifs`,
      desc: "Fiches opérateurs, logos nettoyés, hôtes autorisés, licences par pays, paiements et grilles de notation.",
      href: "/admin/bookmakers",
    },
    {
      title: "Offres",
      count: `${counts.offersPublished} publiées · ${counts.offersDraft} brouillons`,
      desc: "Cycle de vie complet (brouillon, publiée, désactivée, archivée), éligibilité pays et vérification manuelle datée.",
      href: "/admin/offres",
    },
    {
      title: "Codes promo",
      count: `${counts.promoCodesActive} actifs`,
      desc: "Codes rattachés aux bookmakers, offres et pays avec dates de validité.",
      href: "/admin/codes-promo",
    },
    {
      title: "Pays ISO 3166",
      count: `${counts.countriesActive} marchés activés`,
      desc: "Activation des marchés cibles, devise ISO 4217 et langue par défaut.",
      href: "/admin/pays",
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Gestion du catalogue BONUVO OFFERS"
        description="Toutes les données affichées dans l'espace public sont issues exclusivement de ces tables."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <Card key={section.href}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>{section.title}</span>
                <span className="text-xs font-medium text-brand-primary">{section.count}</span>
              </CardTitle>
              <CardDescription>{section.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm" variant="outline">
                <Link href={section.href}>Ouvrir {section.title}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
