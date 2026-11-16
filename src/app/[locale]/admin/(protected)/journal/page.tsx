import { setRequestLocale } from "next-intl/server";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AuditTimeline } from "@/components/admin/AuditTimeline";
import { UiBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listAuditAndSecurityForAdmin } from "@/modules/admin/service";
import { requireAdminAccess } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export default async function AdminJournalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const actor = await requireAdminAccess(locale, "audit.read");
  const { audits, secEvents } = await listAuditAndSecurityForAdmin(actor, 50);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Journal d'audit et sécurité"
        description="Tables immuables en insertion seule (aucune mise à jour ni suppression possible)."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <AuditTimeline
          title={`Journal des actions (${audits.length})`}
          emptyLabel="Aucune entrée d'audit."
          items={audits}
          locale={locale}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Événements de sécurité ({secEvents.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {secEvents.length === 0 ? (
              <p className="text-sm text-fg-muted">Aucun événement de sécurité enregistré.</p>
            ) : (
              secEvents.map((ev) => (
                <div key={ev.id} className="rounded-lg border border-border bg-surface-subtle p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <UiBadge
                        tone={
                          ev.severity === "high" || ev.severity === "critical"
                            ? "danger"
                            : "neutral"
                        }
                      >
                        {ev.severity}
                      </UiBadge>
                      <span className="font-mono text-xs font-semibold text-fg">
                        {ev.eventType}
                      </span>
                    </div>
                    <time className="text-xs text-fg-muted">
                      {new Date(ev.createdAt).toLocaleString(locale === "en" ? "en-GB" : "fr-FR")}
                    </time>
                  </div>
                  {ev.route ? (
                    <p className="mt-1 text-xs text-fg-muted">Route : {ev.route}</p>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
