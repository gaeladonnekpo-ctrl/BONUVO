import { sendNotificationAction } from "@/modules/community/actions";
import { CommunitySubNav } from "./CommunitySubNav";

interface NotificationsAdminViewProps {
  locale: string;
  notifications: Array<{
    id: string;
    titleFr: string;
    channel: string;
    targetCountryCode: string;
    status: string;
    sentCount: number;
    createdAt: Date;
  }>;
  deliveries: Array<{
    id: string;
    channel: string;
    status: string;
    errorText: string;
    createdAt: Date;
  }>;
}

export function NotificationsAdminView({
  locale,
  notifications,
  deliveries,
}: NotificationsAdminViewProps) {
  const isFr = locale === "fr";

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-fg-muted">
          BONUVO NOTIFICATIONS
        </p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-fg sm:text-3xl">
          {isFr
            ? "Diffusion contrôlée & respect des consentements"
            : "Consent-checked notifications"}
        </h1>
        <p className="text-sm text-fg-muted">
          {isFr
            ? "Chaque envoi e-mail vérifie le registre immuable des consentements (`consents`) et respecte le plafond de 90 e-mails/24h."
            : "Every email dispatch checks the append-only `consents` ledger and enforces the 90 emails/24h quota."}
        </p>
      </div>

      <CommunitySubNav locale={locale} activeTab="notifications" />

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
        <h2 className="font-display text-lg font-bold text-fg">
          {isFr ? "Envoyer une notification" : "Dispatch notification"}
        </h2>
        <form action={sendNotificationAction} className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-xs font-semibold text-fg">
              <span>{isFr ? "Canal" : "Channel"}</span>
              <select
                name="channel"
                defaultValue="email"
                className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg"
              >
                <option value="email">E-mail (membres ayant consenti)</option>
                <option value="telegram">Telegram Bot Officiel</option>
              </select>
            </label>
            <label className="block space-y-1 text-xs font-semibold text-fg">
              <span>{isFr ? "Pays cible" : "Target country"}</span>
              <input
                name="targetCountryCode"
                defaultValue="GLOBAL"
                className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg"
              />
            </label>
          </div>

          <label className="block space-y-1 text-xs font-semibold text-fg">
            <span>{isFr ? "Objet / Titre (FR)" : "Subject / Title (FR)"}</span>
            <input
              name="titleFr"
              required
              className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg"
            />
          </label>

          <label className="block space-y-1 text-xs font-semibold text-fg">
            <span>{isFr ? "Message (FR)" : "Message body (FR)"}</span>
            <textarea
              name="bodyFr"
              required
              rows={4}
              className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg"
            />
          </label>

          <button
            type="submit"
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
          >
            {isFr ? "Diffuser maintenant" : "Dispatch now"}
          </button>
        </form>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="font-display text-base font-bold text-fg">
            {isFr ? "Campagnes envoyées" : "Dispatched campaigns"} ({notifications.length})
          </h3>
          <ul className="mt-3 divide-y divide-border text-sm">
            {notifications.map((n) => (
              <li key={n.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="font-semibold text-fg">{n.titleFr}</p>
                  <p className="text-xs text-fg-muted">
                    {n.channel} · {n.targetCountryCode}
                  </p>
                </div>
                <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-semibold text-fg">
                  {n.status} ({n.sentCount})
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="font-display text-base font-bold text-fg">
            {isFr ? "Journal de délivrabilité" : "Delivery log"} ({deliveries.length})
          </h3>
          <ul className="mt-3 divide-y divide-border text-sm">
            {deliveries.slice(0, 15).map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2">
                <span className="font-mono text-xs text-fg">{d.channel}</span>
                <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-fg">
                  {d.status}
                  {d.errorText ? ` · ${d.errorText}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
