import Link from "next/link";
import { Download, History, UserCheck } from "lucide-react";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { updateProfileAction } from "@/modules/members/actions";
import { ConsentToggle } from "./ConsentToggle";
import { DeleteAccountDialog } from "./DeleteAccountDialog";

interface MemberDashboardViewProps {
  locale: "fr" | "en";
  user: {
    id: string;
    email: string;
    roles: string[];
  };
  profile: {
    displayName: string | null;
    countryCode: string | null;
    locale: string;
    status: string;
  } | null;
  preferences: {
    emailAnnouncements: boolean;
    emailPromos: boolean;
    emailPredictions: boolean;
    preferredChannel: string;
  };
  consentHistory: Array<{
    id: string;
    consentType: string;
    granted: boolean;
    policyVersion: string;
    recordedAt: Date;
  }>;
  activities: Array<{
    id: string;
    activityType: string;
    createdAt: Date;
  }>;
  pendingDeletion: {
    id: string;
    status: string;
    requestedAt: Date;
    scheduledPurgeAt: Date;
  } | null;
  unsubscribeToken: string;
}

function formatActivityLabel(activityType: string, isFr: boolean): string {
  switch (activityType) {
    case "profile_updated":
      return isFr ? "Profil mis à jour" : "Profile updated";
    case "consent_updated":
      return isFr ? "Préférences d'alertes mises à jour" : "Alert preferences updated";
    case "data_exported":
      return isFr ? "Données personnelles exportées" : "Personal data exported";
    case "deletion_requested":
      return isFr ? "Demande de fermeture de compte" : "Account closure requested";
    case "deletion_cancelled":
      return isFr ? "Fermeture de compte annulée" : "Account closure cancelled";
    case "unsubscribe_one_click":
      return isFr ? "Désinscription e-mail en un clic" : "One-click email unsubscribe";
    default:
      return isFr ? "Action sur le compte" : "Account action";
  }
}

export function MemberDashboardView({
  locale,
  user,
  profile,
  preferences,
  consentHistory,
  activities,
  pendingDeletion,
  unsubscribeToken,
}: MemberDashboardViewProps) {
  const isFr = locale === "fr";
  const statusLabel =
    (profile?.status ?? "active") === "active"
      ? isFr
        ? "Actif"
        : "Active"
      : isFr
        ? "En attente"
        : "Pending";

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-border bg-surface p-6 shadow-xs">
        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-semibold text-fg">
            <UserCheck className="size-3.5 text-accent" aria-hidden="true" />
            {isFr ? "Espace Membre BONUVO" : "BONUVO Member Area"}
          </span>
          <h1 className="font-display text-2xl font-bold tracking-tight text-fg sm:text-3xl">
            {profile?.displayName || user.email}
          </h1>
          <p className="text-sm text-fg-muted">
            {user.email} · {isFr ? "Compte :" : "Account:"}{" "}
            <strong className="text-fg">{statusLabel}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href="/api/account/export"
            download
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-surface-muted px-4 py-2 text-xs font-semibold text-fg transition hover:bg-bg"
          >
            <Download className="size-3.5" aria-hidden="true" />
            <span>{isFr ? "Exporter mes données" : "Export my data"}</span>
          </a>
          <SignOutButton locale={locale} label={isFr ? "Se déconnecter" : "Sign out"} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-xs sm:p-6 lg:col-span-2">
          <h2 className="font-display text-lg font-bold text-fg">
            {isFr ? "Profil & Préférences régionales" : "Profile & Regional preferences"}
          </h2>
          <form action={updateProfileAction} className="mt-4 space-y-4">
            <input type="hidden" name="userId" value={user.id} />

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block space-y-1 text-xs font-semibold text-fg">
                <span>{isFr ? "Nom d'affichage" : "Display name"}</span>
                <input
                  name="displayName"
                  defaultValue={profile?.displayName ?? ""}
                  placeholder="Alex"
                  className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg"
                />
              </label>

              <label className="block space-y-1 text-xs font-semibold text-fg">
                <span>{isFr ? "Code pays" : "Country code"}</span>
                <input
                  name="countryCode"
                  defaultValue={profile?.countryCode ?? ""}
                  placeholder="CM, CI, SN, FR..."
                  maxLength={2}
                  className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm uppercase text-fg"
                />
              </label>

              <label className="block space-y-1 text-xs font-semibold text-fg">
                <span>{isFr ? "Langue préférée" : "Preferred language"}</span>
                <select
                  name="preferredLocale"
                  defaultValue={profile?.locale ?? locale}
                  className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg"
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
              </label>
            </div>

            <button
              type="submit"
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition hover:bg-accent-hover"
            >
              {isFr ? "Mettre à jour mon profil" : "Update profile"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5 shadow-xs sm:p-6">
          <div className="flex items-center gap-2">
            <History className="size-4 text-accent" aria-hidden="true" />
            <h2 className="font-display text-base font-bold text-fg">
              {isFr ? "Activité récente" : "Recent activity"}
            </h2>
          </div>
          {activities.length === 0 ? (
            <p className="mt-3 text-xs text-fg-muted">
              {isFr
                ? "Aucune activité enregistrée pour le moment."
                : "No recent activity recorded yet."}
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border text-xs">
              {activities.slice(0, 6).map((act) => (
                <li key={act.id} className="flex items-center justify-between py-2">
                  <span className="font-medium text-fg">
                    {formatActivityLabel(act.activityType, isFr)}
                  </span>
                  <span className="text-fg-muted">
                    {new Intl.DateTimeFormat(isFr ? "fr-FR" : "en-US", {
                      dateStyle: "short",
                    }).format(new Date(act.createdAt))}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 border-t border-border pt-3">
            <Link
              href={`/${locale}/desinscription?token=${encodeURIComponent(unsubscribeToken)}`}
              className="text-xs font-semibold text-fg underline hover:text-accent"
            >
              {isFr ? "Se désinscrire des e-mails en un clic" : "One-click email unsubscribe"}
            </Link>
          </div>
        </section>
      </div>

      <ConsentToggle
        locale={locale}
        userId={user.id}
        emailAnnouncements={preferences.emailAnnouncements}
        emailPromos={preferences.emailPromos}
        emailPredictions={preferences.emailPredictions}
        preferredChannel={preferences.preferredChannel}
        consentHistory={consentHistory}
      />

      <DeleteAccountDialog locale={locale} userId={user.id} pendingDeletion={pendingDeletion} />
    </div>
  );
}
