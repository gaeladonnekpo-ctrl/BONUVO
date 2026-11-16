import { getTranslations, setRequestLocale } from "next-intl/server";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminAccess } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const adminUser = await requireAdminAccess(locale, "admin.access");
  const t = await getTranslations("auth.protected");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-fg">{t("adminTitle")}</h1>
          <p className="mt-1 text-sm text-fg-muted">{t("adminSubtitle")}</p>
        </div>
        <SignOutButton locale={locale} label={t("signOut")} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("sessionCardTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-fg-muted">
          <p>
            <strong className="text-fg">{t("identityLabel")} :</strong> {adminUser.displayName} (
            {adminUser.email})
          </p>
          <p>
            <strong className="text-fg">{t("rolesLabel")} :</strong> {adminUser.roles.join(", ")}
          </p>
          <p>
            <strong className="text-fg">{t("assuranceLabel")} :</strong> {adminUser.aal}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
