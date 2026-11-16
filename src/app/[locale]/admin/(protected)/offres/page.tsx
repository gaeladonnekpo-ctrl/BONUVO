import { setRequestLocale } from "next-intl/server";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { OffersView } from "@/components/admin/views/OffersView";
import { listBookmakersForAdmin, listCountriesForAdmin } from "@/modules/offers/bookmaker-service";
import { listOffersForAdmin } from "@/modules/offers/offer-service";
import { requireAdminAccess } from "@/server/auth/guards";
import { can } from "@/server/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminOffersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const actor = await requireAdminAccess(locale, "offers.read");
  const [offers, bookmakers, countries] = await Promise.all([
    listOffersForAdmin(actor),
    listBookmakersForAdmin(actor),
    listCountriesForAdmin(actor, true),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Offres"
        description="Saisie, publication contrôlée et vérification manuelle datée des bonus."
      />
      <OffersView
        offers={offers}
        bookmakers={bookmakers}
        countries={countries}
        canWrite={can(actor, "offers.write")}
      />
    </div>
  );
}
