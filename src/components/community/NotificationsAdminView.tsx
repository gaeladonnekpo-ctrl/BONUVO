import { sendNotificationAction, toggleSubscriberStatusAction } from "@/modules/community/actions";
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
  subscribers?: Array<{
    id: string;
    fullName: string;
    email: string;
    phone: string;
    countryCode: string;
    status: "active" | "unsubscribed";
    consentGranted: boolean;
    consentRecordedAt: Date;
    createdAt: Date;
  }>;
  subscriberSummary?: {
    total: number;
    activeCount: number;
    unsubscribedCount: number;
  };
}

export function NotificationsAdminView({
  locale,
  notifications,
  deliveries,
  subscribers = [],
  subscriberSummary = { total: 0, activeCount: 0, unsubscribedCount: 0 },
}: NotificationsAdminViewProps) {
  const isFr = locale === "fr";

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-fg-muted">
          BONUVO NOTIFICATIONS & CRM
        </p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-fg sm:text-3xl">
          {isFr
            ? "Gestion des abonnés CRM, Newsletter & Notifications"
            : "CRM Subscribers, Newsletter & Notifications"}
        </h1>
        <p className="text-sm text-fg-muted">
          {isFr
            ? "Centralisez les abonnés inscrits via le formulaire Newsletter, gérez leurs consentements et diffusez vos communications."
            : "Centralize subscribers registered via the Newsletter form, manage consents, and dispatch communications."}
        </p>
      </div>

      <CommunitySubNav locale={locale} activeTab="notifications" />

      {/* Section CRM Abonnés Newsletter */}
      <section className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-fg">
              {isFr ? "Base de données abonnés Newsletter (CRM)" : "Newsletter Subscribers (CRM)"}
            </h2>
            <p className="text-xs text-fg-muted">
              {isFr
                ? `${subscriberSummary.activeCount} actif(s) · ${subscriberSummary.unsubscribedCount} désabonné(s) · ${subscriberSummary.total} au total`
                : `${subscriberSummary.activeCount} active · ${subscriberSummary.unsubscribedCount} unsubscribed · ${subscriberSummary.total} total`}
            </p>
          </div>
        </div>

        {subscribers.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface-subtle/50 p-4 text-xs text-fg-muted">
            {isFr
              ? "Aucun abonné enregistré pour le moment."
              : "No newsletter subscribers recorded yet."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead>
                <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
                  <th className="py-2.5 pr-3">{isFr ? "Nom & Prénom" : "Full Name"}</th>
                  <th className="py-2.5 px-3">E-mail</th>
                  <th className="py-2.5 px-3">{isFr ? "Téléphone" : "Phone"}</th>
                  <th className="py-2.5 px-3">{isFr ? "Pays" : "Country"}</th>
                  <th className="py-2.5 px-3">{isFr ? "Statut" : "Status"}</th>
                  <th className="py-2.5 pl-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {subscribers.map((sub) => (
                  <tr key={sub.id}>
                    <td className="py-2.5 pr-3 font-semibold text-fg">{sub.fullName}</td>
                    <td className="py-2.5 px-3 font-mono text-fg">{sub.email}</td>
                    <td className="py-2.5 px-3 text-fg-muted">{sub.phone || "—"}</td>
                    <td className="py-2.5 px-3 font-mono text-fg">{sub.countryCode}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          sub.status === "active"
                            ? "bg-trust-soft text-trust"
                            : "bg-surface-muted text-fg-muted"
                        }`}
                      >
                        {sub.status === "active"
                          ? isFr
                            ? "Actif"
                            : "Active"
                          : isFr
                            ? "Désabonné"
                            : "Unsubscribed"}
                      </span>
                    </td>
                    <td className="py-2.5 pl-3 text-right">
                      <form action={toggleSubscriberStatusAction} className="inline">
                        <input type="hidden" name="subscriberId" value={sub.id} />
                        <input
                          type="hidden"
                          name="nextStatus"
                          value={sub.status === "active" ? "unsubscribed" : "active"}
                        />
                        <button
                          type="submit"
                          className="rounded-lg border border-border bg-bg px-2.5 py-1 text-[11px] font-semibold text-fg hover:border-accent"
                        >
                          {sub.status === "active"
                            ? isFr
                              ? "Désabonner"
                              : "Unsubscribe"
                            : isFr
                              ? "Réactiver"
                              : "Reactivate"}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

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
                <option value="email">E-mail (abonnés et membres ayant consenti)</option>
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
