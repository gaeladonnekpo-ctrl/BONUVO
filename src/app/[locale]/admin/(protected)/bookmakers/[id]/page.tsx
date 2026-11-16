import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BookmakerDetailView } from "@/components/admin/views/BookmakerDetailView";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { listEntityAuditTimeline } from "@/modules/admin/service";
import {
  getBookmakerDetailForAdmin,
  listCountriesForAdmin,
  listPaymentMethodsForAdmin,
} from "@/modules/offers/bookmaker-service";
import { requireAdminAccess } from "@/server/auth/guards";
import { can } from "@/server/auth/permissions";

export const dynamic = "force-dynamic";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function AdminBookmakerDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const actor = await requireAdminAccess(locale, "offers.read");
  if (!UUID_REGEX.test(id)) notFound();

  const [detail, countries, paymentMethods, auditItems] = await Promise.all([
    getBookmakerDetailForAdmin(actor, id),
    listCountriesForAdmin(actor, true),
    listPaymentMethodsForAdmin(actor),
    listEntityAuditTimeline(actor, ["bookmakers"], id),
  ]);

  if (!detail) notFound();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={detail.bookmaker.name}
        description={`Slug : /${detail.bookmaker.slug} · Statut : ${detail.bookmaker.status}`}
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/bookmakers">Retour aux bookmakers</Link>
          </Button>
        }
      />

      <BookmakerDetailView
        bookmaker={detail.bookmaker}
        countries={countries}
        paymentMethods={paymentMethods}
        eligibilityRows={detail.countries}
        paymentRows={detail.paymentMethods}
        ratingRows={detail.ratings}
        auditItems={auditItems}
        canWrite={can(actor, "offers.write")}
      />
    </div>
  );
}
