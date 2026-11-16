import { setRequestLocale } from "next-intl/server";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CountriesView } from "@/components/admin/views/CountriesView";
import { listCountriesForAdmin } from "@/modules/offers/bookmaker-service";
import { requireAdminAccess } from "@/server/auth/guards";
import { can } from "@/server/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminCountriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const actor = await requireAdminAccess(locale, "offers.read");
  const countries = await listCountriesForAdmin(actor, false);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Pays et devises (ISO 3166)"
        description="Référentiel complet issu de la norme ISO 3166-1 et activation des marchés couverts."
      />
      <CountriesView countries={countries} canWrite={can(actor, "offers.write")} />
    </div>
  );
}
