import type { SVGProps } from "react";
import type { CommunityPlatform } from "@/modules/community/channel-url";

export const OFFICIAL_SOCIAL_LINKS = {
  telegram: "https://t.me/+OXjlhqM1ShVmZWM0",
  whatsapp: "https://whatsapp.com/channel/0029VbACyWA4dTnIfN5BA01S",
  facebook: "https://www.facebook.com/profile.php?id=100066896162096",
} as const;

export interface OfficialSocialChannel {
  readonly id: string;
  readonly platform: CommunityPlatform;
  readonly href: string;
  readonly labelFr: string;
  readonly labelEn: string;
  readonly badgeFr: string;
  readonly badgeEn: string;
  readonly ctaFr: string;
  readonly ctaEn: string;
  readonly descriptionFr: string;
  readonly descriptionEn: string;
}

export const OFFICIAL_BONUVO_CHANNELS: readonly OfficialSocialChannel[] = [
  {
    id: "official-telegram",
    platform: "telegram",
    href: OFFICIAL_SOCIAL_LINKS.telegram,
    labelFr: "Canal Telegram",
    labelEn: "Telegram Channel",
    badgeFr: "Telegram Officiel",
    badgeEn: "Official Telegram",
    ctaFr: "Rejoindre sur Telegram",
    ctaEn: "Join on Telegram",
    descriptionFr:
      "Canal Telegram officiel BONUVO : pronostics BONUVO AI en direct, coupons combinés validés et alertes codes promo.",
    descriptionEn:
      "Official BONUVO Telegram channel: live BONUVO AI predictions, validated combined coupons and promo code alerts.",
  },
  {
    id: "official-whatsapp",
    platform: "whatsapp_channel",
    href: OFFICIAL_SOCIAL_LINKS.whatsapp,
    labelFr: "Chaîne WhatsApp",
    labelEn: "WhatsApp Channel",
    badgeFr: "Chaîne WhatsApp Officielle",
    badgeEn: "Official WhatsApp Channel",
    ctaFr: "Suivre sur WhatsApp",
    ctaEn: "Follow on WhatsApp",
    descriptionFr:
      "Chaîne WhatsApp officielle BONUVO : recevez chaque jour nos meilleurs codes promos vérifiés et les sélections sportives.",
    descriptionEn:
      "Official BONUVO WhatsApp channel: receive daily verified promo codes and top sports picks.",
  },
  {
    id: "official-facebook",
    platform: "facebook",
    href: OFFICIAL_SOCIAL_LINKS.facebook,
    labelFr: "Page Facebook",
    labelEn: "Facebook Page",
    badgeFr: "Page Facebook Officielle",
    badgeEn: "Official Facebook Page",
    ctaFr: "Suivre sur Facebook",
    ctaEn: "Follow on Facebook",
    descriptionFr:
      "Page Facebook officielle BONUVO : actualités sportives, nouveaux bonus bookmakers et annonces communautaires.",
    descriptionEn:
      "Official BONUVO Facebook page: sports news, new bookmaker bonuses and community announcements.",
  },
];

export interface SocialBrandIconProps extends SVGProps<SVGSVGElement> {
  platform: CommunityPlatform | "whatsapp";
  variant?: "brand" | "mono";
}

/**
 * Logos vectoriels officiels des réseaux sociaux (Telegram, WhatsApp, Facebook).
 */
export function SocialBrandIcon({
  platform,
  variant = "brand",
  className = "size-5",
  ...props
}: SocialBrandIconProps) {
  if (platform === "telegram") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} {...props}>
        {variant === "brand" ? (
          <>
            <circle cx="12" cy="12" r="12" fill="#229ED9" />
            <path
              d="M17.64 7.18L5.32 11.93c-.84.34-.83.81-.15 1.02l3.16.99 7.31-4.61c.35-.21.67-.1.41.13l-5.93 5.35-.22 3.24c.32 0 .46-.15.64-.32l1.53-1.49 3.18 2.35c.59.32 1.01.16 1.16-.54l2.09-9.86c.21-.86-.33-1.25-.86-1.01z"
              fill="#FFFFFF"
            />
          </>
        ) : (
          <path
            d="M20.66 3.72L2.95 10.55c-1.21.48-1.2 1.16-.22 1.46l4.55 1.42 10.53-6.64c.5-.3.96-.14.58.19l-8.53 7.7-.31 4.66c.46 0 .66-.21.92-.46l2.21-2.14 4.58 3.38c.84.47 1.45.23 1.66-.78l3.01-14.19c.31-1.24-.47-1.8-1.27-1.43z"
            fill="currentColor"
          />
        )}
      </svg>
    );
  }

  if (platform === "facebook") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} {...props}>
        {variant === "brand" ? (
          <>
            <circle cx="12" cy="12" r="12" fill="#1877F2" />
            <path
              d="M15.36 15.2l.49-3.2h-3.07V9.92c0-.88.43-1.73 1.81-1.73h1.4V5.47s-1.27-.22-2.49-.22c-2.54 0-4.2 1.54-4.2 4.33V12H6.48v3.2H9.3v7.63a12.1 12.1 0 003.48 0V15.2h2.58z"
              fill="#FFFFFF"
            />
          </>
        ) : (
          <path
            d="M16.5 14.5l.55-3.6h-3.45V8.56c0-.99.48-1.95 2.04-1.95h1.58V3.55S15.79 3.3 14.42 3.3c-2.86 0-4.72 1.73-4.72 4.87v2.73H6.52v3.6H9.7v8.58h3.9v-8.58h2.9z"
            fill="currentColor"
          />
        )}
      </svg>
    );
  }

  // WhatsApp (whatsapp_channel | whatsapp_group | whatsapp)
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} {...props}>
      {variant === "brand" ? (
        <>
          <circle cx="12" cy="12" r="12" fill="#25D366" />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M17.1 6.88A7.18 7.18 0 0012.02 4.8a7.2 7.2 0 00-6.24 10.79L4.75 19.3l3.82-1a7.2 7.2 0 003.44.88h.01a7.2 7.2 0 005.08-12.3zm-5.08 11.08h-.01a5.98 5.98 0 01-3.05-.84l-.22-.13-2.27.6.61-2.21-.14-.23a5.98 5.98 0 01.92-7.55 5.99 5.99 0 018.46 8.47 5.96 5.96 0 01-4.3 1.89zm3.28-4.48c-.18-.09-1.06-.52-1.22-.58-.17-.06-.29-.09-.41.09-.12.18-.46.58-.57.7-.1.12-.21.14-.39.05-.18-.09-.76-.28-1.45-.89a5.44 5.44 0 01-1-1.25c-.11-.18-.01-.28.08-.37.08-.08.18-.21.27-.31.09-.1.12-.18.18-.3.06-.12.03-.23-.02-.32-.04-.09-.41-.98-.56-1.35-.15-.35-.3-.3-.41-.31h-.35c-.12 0-.31.05-.48.23-.16.18-.62.61-.62 1.48s.64 1.72.73 1.84c.09.12 1.25 1.92 3.04 2.69.42.18.75.29 1.01.37.43.14.82.12 1.13.07.35-.05 1.06-.43 1.21-.85.15-.42.15-.78.1-.85-.04-.08-.16-.12-.34-.21z"
            fill="#FFFFFF"
          />
        </>
      ) : (
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M19.05 4.91A9.82 9.82 0 0012.08 2a9.9 9.9 0 00-8.57 14.84L2.1 22l5.25-1.38a9.9 9.9 0 004.73 1.2h.01a9.9 9.9 0 006.96-16.91zm-6.97 15.24h-.01a8.22 8.22 0 01-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.23 8.23 0 011.27-10.38 8.24 8.24 0 0111.63 11.65 8.2 8.2 0 01-5.91 2.59zm4.51-6.16c-.25-.12-1.46-.72-1.68-.8-.23-.08-.39-.12-.56.12-.16.25-.64.8-.78.97-.15.16-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23a7.48 7.48 0 01-1.38-1.71c-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.34-.76-1.85-.2-.48-.41-.41-.56-.42h-.48c-.16 0-.43.06-.66.31-.22.25-.86.84-.86 2.04s.88 2.36 1 2.53c.13.16 1.72 2.64 4.18 3.7.58.25 1.04.4 1.39.51.59.19 1.13.16 1.55.1.48-.07 1.46-.6 1.67-1.17.2-.58.2-1.07.14-1.17-.06-.11-.23-.17-.47-.29z"
          fill="currentColor"
        />
      )}
    </svg>
  );
}
