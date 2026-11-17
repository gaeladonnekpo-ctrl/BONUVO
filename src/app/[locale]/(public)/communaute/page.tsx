import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquare, Sparkles, Ticket, Users } from "lucide-react";
import { ChannelCard } from "@/components/community/ChannelCard";
import { CouponCard } from "@/components/community/CouponCard";
import { PostCard } from "@/components/community/PostCard";
import { listPublicCommunityData } from "@/modules/community/service";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isFr = locale === "fr";
  return {
    title: isFr
      ? "BONUVO COMMUNITY — Canaux Telegram, WhatsApp, Coupons & Actualités"
      : "BONUVO COMMUNITY — Telegram, WhatsApp Channels, Coupons & News",
    description: isFr
      ? "Rejoignez les canaux officiels BONUVO COMMUNITY (Telegram & WhatsApp), consultez les coupons validés et suivez les annonces vérifiées."
      : "Join official BONUVO COMMUNITY channels (Telegram & WhatsApp), browse validated coupons and follow verified announcements.",
  };
}

export default async function PublicCommunityPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ country?: string }>;
}) {
  const { locale } = await params;
  const sp = (await searchParams) ?? {};
  const isFr = locale === "fr";
  const lang: "fr" | "en" = isFr ? "fr" : "en";

  const { channels, coupons, posts } = await listPublicCommunityData(sp.country);

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-8 sm:px-6 sm:py-12">
      <section className="rounded-3xl border border-border bg-surface p-6 shadow-xs sm:p-10">
        <div className="max-w-3xl space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-muted px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-fg">
            <Users className="size-3.5 text-accent" aria-hidden="true" />
            BONUVO COMMUNITY
          </span>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">
            {isFr
              ? "Canaux officiels, coupons validés & actualités vérifiées"
              : "Official channels, validated coupons & verified news"}
          </h1>
          <p className="text-base leading-relaxed text-fg-muted">
            {isFr
              ? "Accédez librement aux canaux Telegram et WhatsApp officiels BONUVO, aux coupons validés par nos analystes et aux annonces de nouvelles offres bookmakers."
              : "Access official BONUVO Telegram and WhatsApp channels, analyst-validated coupons and bookmaker bonus announcements."}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href={`/${locale}/pronostics`}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition hover:bg-accent-hover"
            >
              <Sparkles className="size-4" aria-hidden="true" />
              <span>{isFr ? "Explorer BONUVO AI" : "Explore BONUVO AI"}</span>
            </Link>
            <Link
              href={`/${locale}/offres`}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-surface-muted px-5 py-2.5 text-sm font-semibold text-fg transition hover:bg-bg"
            >
              <span>
                {isFr ? "Voir toutes les offres sans compte" : "Browse all offers without account"}
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="channels-heading" className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h2
              id="channels-heading"
              className="font-display text-2xl font-bold tracking-tight text-fg"
            >
              {isFr
                ? "Canaux Telegram & WhatsApp officiels"
                : "Official Telegram & WhatsApp channels"}
            </h2>
            <p className="text-sm text-fg-muted">
              {isFr
                ? "Liens vérifiés sur domaines officiels uniquement (t.me, whatsapp.com)."
                : "Verified links on official domains only (t.me, whatsapp.com)."}
            </p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {channels.map((ch) => (
            <ChannelCard key={ch.id} channel={ch} locale={lang} />
          ))}
        </div>
      </section>

      <section aria-labelledby="coupons-heading" className="space-y-5">
        <div className="space-y-1">
          <h2
            id="coupons-heading"
            className="font-display text-2xl font-bold tracking-tight text-fg"
          >
            {isFr ? "Coupons communautaires validés" : "Validated community coupons"}
          </h2>
          <p className="text-sm text-fg-muted">
            {isFr
              ? "Sélections revues avant diffusion communautaire — estimations probabilistes sans garantie de gain."
              : "Selections reviewed before community broadcast — probabilistic estimates with no guaranteed winnings."}
          </p>
        </div>

        {coupons.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-fg-muted">
            <div className="flex items-center gap-2 font-semibold text-fg">
              <Ticket className="size-4 text-accent" aria-hidden="true" />
              <span>
                {isFr
                  ? "Aucun coupon communautaire publié pour cet horaire."
                  : "No community coupon published for this time slot."}
              </span>
            </div>
            <p className="mt-1">
              {isFr
                ? "Consultez les pronostics en direct sur BONUVO AI ou rejoignez le canal Telegram officiel."
                : "Check live predictions on BONUVO AI or join the official Telegram channel."}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {coupons.map((cp) => (
              <CouponCard key={cp.id} coupon={cp} locale={lang} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="posts-heading" className="space-y-5">
        <div className="space-y-1">
          <h2 id="posts-heading" className="font-display text-2xl font-bold tracking-tight text-fg">
            {isFr ? "Annonces & Actualités" : "Announcements & News"}
          </h2>
          <p className="text-sm text-fg-muted">
            {isFr
              ? "Mises à jour des bonus bookmakers, guides codes promo et nouveautés BONUVO."
              : "Bookmaker bonus updates, promo code guides and BONUVO news."}
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-fg-muted">
            <div className="flex items-center gap-2 font-semibold text-fg">
              <MessageSquare className="size-4 text-accent" aria-hidden="true" />
              <span>
                {isFr
                  ? "Les prochaines actualités éditoriales seront publiées ici."
                  : "Upcoming editorial news will be published here."}
              </span>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} locale={lang} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
