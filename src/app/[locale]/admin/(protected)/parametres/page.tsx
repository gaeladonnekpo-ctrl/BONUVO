import { setRequestLocale } from "next-intl/server";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SettingsView } from "@/components/admin/views/SettingsView";
import { listSettingsForAdmin } from "@/modules/admin/service";
import { requireAdminAccess } from "@/server/auth/guards";
import { can } from "@/server/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const actor = await requireAdminAccess(locale, "settings.read");
  const rows = await listSettingsForAdmin(actor);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Paramètres de la plateforme"
        description="Lecture réservée (settings.read) ; modification réservée aux super_admin (settings.manage)."
      />
      <SettingsView settings={rows} canManage={can(actor, "settings.manage")} />
    </div>
  );
}
