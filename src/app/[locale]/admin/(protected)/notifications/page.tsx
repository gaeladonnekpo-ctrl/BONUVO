import type { Metadata } from "next";
import { NotificationsAdminView } from "@/components/community/NotificationsAdminView";
import { listAdminNotifications } from "@/modules/community/notification-service";
import { requireAdminAccess } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Administration Notifications — BONUVO",
  robots: { index: false, follow: false },
};

export default async function AdminNotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const actor = await requireAdminAccess(locale, "community.manage");
  const { notifications, deliveries } = await listAdminNotifications(actor.id);

  return (
    <NotificationsAdminView locale={locale} notifications={notifications} deliveries={deliveries} />
  );
}
