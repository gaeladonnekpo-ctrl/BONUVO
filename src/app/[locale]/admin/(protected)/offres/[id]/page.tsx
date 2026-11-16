import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { OfferDetailView } from "@/components/admin/views/OfferDetailView";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { listEntityAuditTimeline } from "@/modules/admin/service";
import { listCountriesForAdmin } from "@/modules/offers/bookmaker-service";
import { getOfferDetailForAdmin } from "@/modules/offers/offer-service";
import { requireAdminAccess } from "@/server/auth/guards";
import { can } from "@/server/auth/permissions";

export const dynamic = "force-dynamic";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function AdminOfferDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const actor = await requireAdminAccess(locale, "offers.read");
  if (!UUID_REGEX.test(id)) notFound();

  const [detail, countries, auditItems] = await Promise.all([
    getOfferDetailForAdmin(actor, id),
    listCountriesForAdmin(actor, true),
    listEntityAuditTimeline(actor, ["offers"], id),
  ]);

  if (!detail) notFound();

  const canDelete =
    can(actor, "offers.publish") &&
    (actor.roles.includes("admin") || actor.roles.includes("super_admin"));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={detail.offer.titleFr}
        description={`${detail.offer.bookmakerName} · /${detail.offer.slug}`}
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/offres">Retour aux offres</Link>
          </Button>
        }
      />
      <OfferDetailView
        offer={detail.offer}
        selectedCountryIds={detail.countries.map((c) => c.countryId)}
        countries={countries}
        terms={detail.terms}
        highlights={detail.highlights}
        promoCodes={detail.promoCodes}
        auditItems={auditItems}
        canWrite={can(actor, "offers.write")}
        canPublish={can(actor, "offers.publish")}
        canDelete={canDelete}
      />
    </div>
  );
}
