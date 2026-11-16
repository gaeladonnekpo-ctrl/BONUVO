import { setRequestLocale } from "next-intl/server";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AuditTimeline } from "@/components/admin/AuditTimeline";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { getAdminDashboardData } from "@/modules/admin/service";
import { requireAdminAccess } from "@/server/auth/guards";
import { can } from "@/server/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const adminUser = await requireAdminAccess(locale, "admin.access");
  const dashboard = await getAdminDashboardData(adminUser);

  const kpis = [
    {
      label: "Bookmakers actifs",
      value: dashboard.counts.bookmakersActive,
      href: "/admin/bookmakers",
    },
    { label: "Offres publiées", value: dashboard.counts.offersPublished, href: "/admin/offres" },
    { label: "Offres brouillons", value: dashboard.counts.offersDraft, href: "/admin/offres" },
    {
      label: `À vérifier (>${dashboard.staleThresholdDays} j)`,
      value: dashboard.counts.offersStaleVerification,
      href: "/admin/offres",
      alert: dashboard.counts.offersStaleVerification > 0,
    },
    {
      label: "Codes promo actifs",
      value: dashboard.counts.promoCodesActive,
      href: "/admin/codes-promo",
    },
    {
      label: "Liens d'affiliation actifs",
      value: dashboard.counts.affiliateLinksActive,
      href: "/admin/affiliation",
    },
    { label: "Pays activés", value: dashboard.counts.countriesActive, href: "/admin/pays" },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Tableau de bord d'administration"
        description={`Session ${adminUser.displayName} (${adminUser.roles.join(", ")}) · Niveau ${adminUser.aal}`}
        actions={<SignOutButton locale={locale} label="Déconnexion" />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((item) => (
          <Link key={item.label} href={item.href} className="block">
            <Card className="transition-colors hover:border-brand-primary/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-fg-muted">{item.label}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="font-display text-3xl font-bold text-fg">{item.value}</span>
                {item.alert ? <UiBadge tone="warning">Alerte fraîcheur</UiBadge> : null}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Offres publiées en attente de vérification manuelle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.staleOffers.length === 0 ? (
              <p className="text-sm text-fg-muted">
                Aucune offre publiée ne dépasse le seuil de {dashboard.staleThresholdDays} jours.
              </p>
            ) : (
              dashboard.staleOffers.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"
                >
                  <div>
                    <p className="font-semibold text-fg">{item.titleFr}</p>
                    <p className="text-xs text-fg-muted">
                      {item.bookmakerName} ·{" "}
                      {item.lastVerifiedAt
                        ? `Vérifiée le ${new Date(item.lastVerifiedAt).toLocaleDateString("fr-FR")}`
                        : "Jamais vérifiée"}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/offres/${item.id}`}>Vérifier</Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {can(adminUser, "audit.read") ? (
          <AuditTimeline
            title="Dernières écritures au journal"
            emptyLabel="Aucune action journalisée pour le moment."
            items={dashboard.recentAudit}
            locale={locale}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Accès rapides</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href="/admin/bookmakers">Bookmakers</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/admin/offres">Offres</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/admin/codes-promo">Codes promo</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
