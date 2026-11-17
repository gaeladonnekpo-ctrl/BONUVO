import { saveChannelAction, saveCouponAction } from "@/modules/community/actions";
import { CommunitySubNav } from "./CommunitySubNav";

interface CommunityAdminViewProps {
  locale: string;
  channels: Array<{
    id: string;
    platform: string;
    countryCode: string;
    titleFr: string;
    inviteUrl: string;
    active: boolean;
  }>;
  coupons: Array<{
    id: string;
    titleFr: string;
    couponCode: string;
    combinedOdds: string | null;
    countryCode: string;
    status: string;
    publishedToTelegramAt: Date | null;
  }>;
}

export function CommunityAdminView({ locale, channels, coupons }: CommunityAdminViewProps) {
  const isFr = locale === "fr";

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-fg-muted">
          BONUVO COMMUNITY
        </p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-fg sm:text-3xl">
          {isFr
            ? "Pilotage des canaux & coupons validés"
            : "Community channels & validated coupons"}
        </h1>
        <p className="text-sm text-fg-muted">
          {isFr
            ? "Seuls les domaines officiels Telegram (t.me) et WhatsApp (whatsapp.com, chat.whatsapp.com, wa.me) sont autorisés."
            : "Only official Telegram (t.me) and WhatsApp (whatsapp.com, chat.whatsapp.com, wa.me) domains are allowed."}
        </p>
      </div>

      <CommunitySubNav locale={locale} activeTab="communaute" />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
          <h2 className="font-display text-lg font-bold text-fg">
            {isFr ? "Ajouter un canal officiel" : "Add an official channel"}
          </h2>
          <form action={saveChannelAction} className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-xs font-semibold text-fg">
                <span>{isFr ? "Plateforme" : "Platform"}</span>
                <select
                  name="platform"
                  defaultValue="telegram"
                  className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg"
                >
                  <option value="telegram">Telegram</option>
                  <option value="whatsapp_channel">WhatsApp Channel</option>
                  <option value="whatsapp_group">WhatsApp Group</option>
                </select>
              </label>
              <label className="block space-y-1 text-xs font-semibold text-fg">
                <span>{isFr ? "Pays cible" : "Target country"}</span>
                <input
                  name="countryCode"
                  defaultValue="GLOBAL"
                  className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg"
                />
              </label>
            </div>

            <label className="block space-y-1 text-xs font-semibold text-fg">
              <span>{isFr ? "Titre (FR)" : "Title (FR)"}</span>
              <input
                name="titleFr"
                required
                placeholder="BONUVO Telegram Officiel"
                className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg"
              />
            </label>

            <label className="block space-y-1 text-xs font-semibold text-fg">
              <span>{isFr ? "URL d'invitation (HTTPS)" : "Invite URL (HTTPS)"}</span>
              <input
                name="inviteUrl"
                type="url"
                required
                placeholder="https://t.me/bonuvo_official"
                className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg"
              />
            </label>

            <label className="block space-y-1 text-xs font-semibold text-fg">
              <span>{isFr ? "Description (FR)" : "Description (FR)"}</span>
              <textarea
                name="descriptionFr"
                rows={2}
                className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg"
              />
            </label>

            <button
              type="submit"
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
            >
              {isFr ? "Enregistrer le canal" : "Save channel"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
          <h2 className="font-display text-lg font-bold text-fg">
            {isFr ? "Publier un coupon validé" : "Publish a validated coupon"}
          </h2>
          <form action={saveCouponAction} className="mt-4 space-y-3">
            <label className="block space-y-1 text-xs font-semibold text-fg">
              <span>{isFr ? "Titre du coupon (FR)" : "Coupon title (FR)"}</span>
              <input
                name="titleFr"
                required
                placeholder="Combiné Ligue des Champions"
                className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block space-y-1 text-xs font-semibold text-fg">
                <span>{isFr ? "Code coupon" : "Coupon code"}</span>
                <input
                  name="couponCode"
                  required
                  placeholder="BNV-774"
                  className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg"
                />
              </label>
              <label className="block space-y-1 text-xs font-semibold text-fg">
                <span>{isFr ? "Cote combinée" : "Combined odds"}</span>
                <input
                  name="combinedOdds"
                  placeholder="2.85"
                  className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg"
                />
              </label>
              <label className="block space-y-1 text-xs font-semibold text-fg">
                <span>{isFr ? "Statut" : "Status"}</span>
                <select
                  name="status"
                  defaultValue="validated"
                  className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg"
                >
                  <option value="validated">Validé</option>
                  <option value="draft">Brouillon</option>
                  <option value="archived">Archivé</option>
                </select>
              </label>
            </div>

            <label className="block space-y-1 text-xs font-semibold text-fg">
              <span>{isFr ? "Argumentaire (FR)" : "Analysis summary (FR)"}</span>
              <textarea
                name="descriptionFr"
                rows={2}
                className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg"
              />
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-fg">
              <input
                type="checkbox"
                name="publishToTelegram"
                defaultChecked
                className="size-4 rounded border-border"
              />
              <span>
                {isFr
                  ? "Diffuser automatiquement sur le canal Telegram configuré"
                  : "Auto-publish to configured Telegram channel"}
              </span>
            </label>

            <button
              type="submit"
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
            >
              {isFr ? "Valider et publier le coupon" : "Validate & publish coupon"}
            </button>
          </form>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="font-display text-base font-bold text-fg">
            {isFr ? "Canaux configurés" : "Configured channels"} ({channels.length})
          </h3>
          <ul className="mt-3 divide-y divide-border text-sm">
            {channels.map((ch) => (
              <li key={ch.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="font-semibold text-fg">{ch.titleFr}</p>
                  <p className="text-xs text-fg-muted">{ch.inviteUrl}</p>
                </div>
                <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-fg">
                  {ch.platform} · {ch.countryCode}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="font-display text-base font-bold text-fg">
            {isFr ? "Coupons communautaires" : "Community coupons"} ({coupons.length})
          </h3>
          <ul className="mt-3 divide-y divide-border text-sm">
            {coupons.map((cp) => (
              <li key={cp.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="font-semibold text-fg">{cp.titleFr}</p>
                  <p className="font-mono text-xs text-fg-muted">
                    {cp.couponCode} {cp.combinedOdds ? `· Cote ${cp.combinedOdds}` : ""}
                  </p>
                </div>
                <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-fg">
                  {cp.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
