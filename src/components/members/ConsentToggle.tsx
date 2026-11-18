import { ShieldCheck } from "lucide-react";
import { updateConsentPreferencesAction } from "@/modules/members/actions";

interface ConsentToggleProps {
  locale: "fr" | "en";
  userId: string;
  emailAnnouncements: boolean;
  emailPromos: boolean;
  emailPredictions: boolean;
  preferredChannel: string;
  consentHistory: Array<{
    id: string;
    consentType: string;
    granted: boolean;
    policyVersion: string;
    recordedAt: Date;
  }>;
}

function formatConsentTypeLabel(consentType: string, isFr: boolean): string {
  switch (consentType) {
    case "notifications":
      return isFr ? "Alertes & notifications" : "Alerts & notifications";
    case "marketing":
      return isFr ? "Communications par e-mail" : "Email communications";
    case "analytics":
      return isFr ? "Mesure d'audience" : "Audience measurement";
    default:
      return isFr ? "Préférences de communication" : "Communication preferences";
  }
}

export function ConsentToggle({
  locale,
  userId,
  emailAnnouncements,
  emailPromos,
  emailPredictions,
  preferredChannel,
  consentHistory,
}: ConsentToggleProps) {
  const isFr = locale === "fr";
  const currentlyGranted =
    (emailAnnouncements || emailPromos || emailPredictions) && preferredChannel !== "none";

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-xs sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-semibold text-fg">
            <ShieldCheck className="size-3.5 text-accent" aria-hidden="true" />
            {isFr ? "Consentements & Communications" : "Consents & Communications"}
          </span>
          <h2 className="mt-2 font-display text-lg font-bold text-fg">
            {isFr ? "Vos préférences d'alertes" : "Your alert preferences"}
          </h2>
          <p className="mt-1 text-sm text-fg-muted">
            {isFr
              ? "Choisissez librement les alertes que vous souhaitez recevoir et modifiez-les à tout moment."
              : "Freely choose which alerts you want to receive and update them at any time."}
          </p>
        </div>

        <span className="rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-semibold text-fg">
          {currentlyGranted
            ? isFr
              ? "Communications actives"
              : "Communications active"
            : isFr
              ? "Communications désactivées"
              : "Communications disabled"}
        </span>
      </div>

      <form action={updateConsentPreferencesAction} className="mt-5 space-y-4">
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="consentType" value="notifications" />

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-start gap-3 rounded-xl border border-border bg-bg p-3.5 text-sm text-fg">
            <input
              type="checkbox"
              name="granted"
              defaultChecked={currentlyGranted}
              className="mt-0.5 size-4 rounded border-border"
            />
            <div>
              <p className="font-semibold text-fg">
                {isFr
                  ? "J'accepte de recevoir les communications BONUVO"
                  : "I agree to receive BONUVO communications"}
              </p>
              <p className="text-xs text-fg-muted">
                {isFr ? "Révocable à tout moment en 1 clic." : "Revocable anytime in 1 click."}
              </p>
            </div>
          </label>

          <label className="block space-y-1.5 rounded-xl border border-border bg-bg p-3.5 text-xs font-semibold text-fg">
            <span>{isFr ? "Canal privilégié" : "Preferred channel"}</span>
            <select
              name="preferredChannel"
              defaultValue={preferredChannel || "email"}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg"
            >
              <option value="email">E-mail</option>
              <option value="telegram">Telegram</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="none">{isFr ? "Aucun (Tout couper)" : "None (Disable all)"}</option>
            </select>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex items-center gap-2.5 rounded-xl border border-border bg-bg px-3.5 py-2.5 text-xs font-semibold text-fg">
            <input
              type="checkbox"
              name="emailAnnouncements"
              defaultChecked={emailAnnouncements}
              className="size-4 rounded border-border"
            />
            <span>{isFr ? "Annonces officielles" : "Official announcements"}</span>
          </label>

          <label className="flex items-center gap-2.5 rounded-xl border border-border bg-bg px-3.5 py-2.5 text-xs font-semibold text-fg">
            <input
              type="checkbox"
              name="emailPromos"
              defaultChecked={emailPromos}
              className="size-4 rounded border-border"
            />
            <span>{isFr ? "Codes promos vérifiés" : "Verified promo codes"}</span>
          </label>

          <label className="flex items-center gap-2.5 rounded-xl border border-border bg-bg px-3.5 py-2.5 text-xs font-semibold text-fg">
            <input
              type="checkbox"
              name="emailPredictions"
              defaultChecked={emailPredictions}
              className="size-4 rounded border-border"
            />
            <span>{isFr ? "Sélections BONUVO AI" : "BONUVO AI picks"}</span>
          </label>
        </div>

        <button
          type="submit"
          className="inline-flex min-h-10 items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition hover:bg-accent-hover"
        >
          {isFr ? "Enregistrer mes préférences" : "Save preferences"}
        </button>
      </form>

      {consentHistory.length > 0 ? (
        <div className="mt-6 border-t border-border pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
            {isFr ? "Historique de vos préférences" : "Preferences history"}
          </h3>
          <ul className="mt-2 divide-y divide-border text-xs">
            {consentHistory.slice(0, 5).map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="font-medium text-fg">
                  {formatConsentTypeLabel(item.consentType, isFr)}
                </span>
                <span className="text-fg-muted">
                  {item.granted ? (isFr ? "Activé" : "Enabled") : isFr ? "Désactivé" : "Disabled"} ·{" "}
                  {new Intl.DateTimeFormat(isFr ? "fr-FR" : "en-US", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(item.recordedAt))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
