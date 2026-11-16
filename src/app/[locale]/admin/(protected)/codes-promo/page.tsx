import { setRequestLocale } from "next-intl/server";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PromoCodesView } from "@/components/admin/views/PromoCodesView";
import { listBookmakersForAdmin, listCountriesForAdmin } from "@/modules/offers/bookmaker-service";
import { listOffersForAdmin, listPromoCodesForAdmin } from "@/modules/offers/offer-service";
import { requireAdminAccess } from "@/server/auth/guards";
import { can } from "@/server/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminPromoCodesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const actor = await requireAdminAccess(locale, "offers.read");
  const [codes, bookmakers, offers, countries] = await Promise.all([
    listPromoCodesForAdmin(actor),
    listBookmakersForAdmin(actor),
    listOffersForAdmin(actor),
    listCountriesForAdmin(actor, true),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Codes promo"
        description="Codes promotionnels vérifiés rattachés aux bookmakers, offres et pays éligibles."
      />
      <PromoCodesView
        codes={codes}
        bookmakers={bookmakers}
        offers={offers}
        countries={countries}
        canWrite={can(actor, "offers.write")}
      />
    </div>
  );
}
