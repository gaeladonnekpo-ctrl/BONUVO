import { setRequestLocale } from "next-intl/server";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BookmakersView } from "@/components/admin/views/BookmakersView";
import { listBookmakersForAdmin } from "@/modules/offers/bookmaker-service";
import { requireAdminAccess } from "@/server/auth/guards";
import { can } from "@/server/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminBookmakersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const actor = await requireAdminAccess(locale, "offers.read");
  const rows = await listBookmakersForAdmin(actor);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Bookmakers"
        description="Référentiel des opérateurs, hôtes autorisés pour l'affiliation et logos vérifiés."
      />
      <BookmakersView bookmakers={rows} canWrite={can(actor, "offers.write")} />
    </div>
  );
}
