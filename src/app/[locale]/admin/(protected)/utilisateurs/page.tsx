import { setRequestLocale } from "next-intl/server";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { UsersView } from "@/components/admin/views/UsersView";
import { listUsersForAdmin } from "@/modules/admin/service";
import { requireAdminAccess } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const actor = await requireAdminAccess(locale, "users.manage");
  const users = await listUsersForAdmin(actor);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Utilisateurs et rôles"
        description="Attribution et révocation des rôles RBAC sous contrôle B7 (protection super_admin)."
      />
      <UsersView users={users} actorIsSuperAdmin={actor.roles.includes("super_admin")} />
    </div>
  );
}
