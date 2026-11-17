import { setRequestLocale } from "next-intl/server";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CountriesView } from "@/components/admin/views/CountriesView";
import {
  compareByBettingPriority,
  getBettingPriorityTier,
  getCountryContinent,
} from "@/lib/i18n/betting-priority";
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
  const rawCountries = await listCountriesForAdmin(actor, false);
  const countries = [...rawCountries].sort(compareByBettingPriority).map((c) => ({
    ...c,
    priorityTier: getBettingPriorityTier(c.code),
    continent: getCountryContinent(c.code),
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Pays et devises (ISO 3166)"
        description="Référentiel mondial complet ISO 3166-1 (249 pays et territoires), classé par priorité paris sportifs & gaming avec activation/désactivation à la carte."
      />
      <CountriesView countries={countries} canWrite={can(actor, "offers.write")} />
    </div>
  );
}
