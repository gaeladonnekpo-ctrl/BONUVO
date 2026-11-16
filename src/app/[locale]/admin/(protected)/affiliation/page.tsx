import { setRequestLocale } from "next-intl/server";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AffiliationView } from "@/components/admin/views/AffiliationView";
import { listAffiliateDataForAdmin } from "@/modules/offers/affiliation-service";
import { listBookmakersForAdmin, listCountriesForAdmin } from "@/modules/offers/bookmaker-service";
import { listOffersForAdmin } from "@/modules/offers/offer-service";
import { requireAdminAccess } from "@/server/auth/guards";
import { can } from "@/server/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminAffiliationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const actor = await requireAdminAccess(locale, "offers.read");
  const [{ networks, links }, bookmakers, countries, offers] = await Promise.all([
    listAffiliateDataForAdmin(actor),
    listBookmakersForAdmin(actor),
    listCountriesForAdmin(actor, true),
    listOffersForAdmin(actor),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Affiliation et liens sortants"
        description="Chaque lien HTTPS est contrôlé contre la liste allowed_hosts du bookmaker (contrôle B1)."
      />
      <AffiliationView
        networks={networks}
        links={links}
        bookmakers={bookmakers}
        countries={countries}
        offers={offers}
        canManageLinks={can(actor, "links.manage")}
      />
    </div>
  );
}
