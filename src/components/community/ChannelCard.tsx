import { ExternalLink } from "lucide-react";
import type { PublicChannelItem } from "@/modules/community/service";
import { SocialBrandIcon } from "./SocialBrandIcon";

interface ChannelCardProps {
  channel: PublicChannelItem;
  locale: "fr" | "en";
}

export function ChannelCard({ channel, locale }: ChannelCardProps) {
  const isFr = locale === "fr";
  const title = isFr ? channel.titleFr : channel.titleEn || channel.titleFr;
  const description = isFr ? channel.descriptionFr : channel.descriptionEn || channel.descriptionFr;

  const platformBadge =
    channel.platform === "telegram"
      ? isFr
        ? "Telegram Officiel"
        : "Official Telegram"
      : channel.platform === "facebook"
        ? isFr
          ? "Page Facebook Officielle"
          : "Official Facebook Page"
        : channel.platform === "whatsapp_channel"
          ? isFr
            ? "Chaîne WhatsApp Officielle"
            : "Official WhatsApp Channel"
          : isFr
            ? "Groupe WhatsApp"
            : "WhatsApp Group";

  const ctaLabel =
    channel.platform === "telegram"
      ? isFr
        ? "Rejoindre sur Telegram"
        : "Join on Telegram"
      : channel.platform === "facebook"
        ? isFr
          ? "Suivre sur Facebook"
          : "Follow on Facebook"
        : isFr
          ? "Suivre sur WhatsApp"
          : "Follow on WhatsApp";

  return (
    <article className="group flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-semibold text-fg">
            <SocialBrandIcon platform={channel.platform} className="size-4 shrink-0" />
            <span>{platformBadge}</span>
          </span>
          <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-fg-muted">
            {channel.countryCode === "GLOBAL"
              ? isFr
                ? "International"
                : "Global"
              : channel.countryCode}
          </span>
        </div>

        <h3 className="font-display text-lg font-bold tracking-tight text-fg">{title}</h3>

        {description ? (
          <p className="text-sm leading-relaxed text-fg-muted">{description}</p>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
        <span className="text-xs font-medium text-fg-muted">
          {channel.subscriberCountLabel || (isFr ? "Accès vérifié" : "Verified access")}
        </span>
        <a
          href={channel.inviteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-accent-fg transition hover:bg-accent-hover"
        >
          <SocialBrandIcon
            platform={channel.platform}
            className="size-4 shrink-0 rounded-full ring-1 ring-white/30"
          />
          <span>{ctaLabel}</span>
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}
