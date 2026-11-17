import { ExternalLink, MessageCircle, Send } from "lucide-react";
import type { PublicChannelItem } from "@/modules/community/service";

interface ChannelCardProps {
  channel: PublicChannelItem;
  locale: "fr" | "en";
}

export function ChannelCard({ channel, locale }: ChannelCardProps) {
  const isFr = locale === "fr";
  const isTelegram = channel.platform === "telegram";
  const title = isFr ? channel.titleFr : channel.titleEn || channel.titleFr;
  const description = isFr ? channel.descriptionFr : channel.descriptionEn || channel.descriptionFr;

  const platformBadge =
    channel.platform === "telegram"
      ? "Telegram Officiel"
      : channel.platform === "whatsapp_channel"
        ? isFr
          ? "Chaîne WhatsApp"
          : "WhatsApp Channel"
        : isFr
          ? "Groupe WhatsApp"
          : "WhatsApp Group";

  return (
    <article className="group flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-semibold text-fg">
            {isTelegram ? (
              <Send className="size-3.5 text-accent" aria-hidden="true" />
            ) : (
              <MessageCircle className="size-3.5 text-success" aria-hidden="true" />
            )}
            {platformBadge}
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
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-accent-fg transition hover:bg-accent-hover"
        >
          <span>{isFr ? "Rejoindre le canal" : "Join channel"}</span>
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}
