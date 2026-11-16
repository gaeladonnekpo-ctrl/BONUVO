export type DataComponentState = "loading" | "content" | "empty" | "error";

export type BusinessBadgeTone =
  "recommended" | "exclusive" | "new" | "verified" | "warning" | "neutral";

export interface OfferCardData {
  readonly id: string;
  readonly offerSlug?: string;
  readonly bookmakerId?: string;
  readonly promoCodeId?: string | null;
  readonly rank?: number;
  readonly bookmakerName: string;
  readonly bookmakerShortName: string;
  readonly bookmakerLogoUrl?: string | null;
  readonly bonusHeadline: string;
  readonly bonusAmountDisplay: string;
  readonly ratingScore: number | null;
  readonly ratingMax?: number;
  readonly badges?: readonly BusinessBadgeTone[];
  readonly highlights: readonly string[];
  readonly weaknessNote?: string;
  readonly rolloverText?: string;
  readonly paymentMethods: readonly string[];
  readonly promoCode?: string;
  readonly promoValidOn?: string;
  readonly ctaHref?: string;
  readonly detailHref?: string;
  readonly verifiedDateLabel?: string;
  readonly licenseLabel?: string;
  readonly termsSummary?: string;
  readonly isDevExample?: boolean;
}

export interface PartnerGridItem {
  readonly id: string;
  readonly name: string;
  readonly shortCode: string;
  readonly slug?: string;
  readonly logoUrl?: string | null;
  readonly licenseSummary?: string;
  readonly isDevExample?: boolean;
}

export interface CommunityChannelLink {
  readonly id: string;
  readonly platform: "telegram" | "whatsapp";
  readonly href: string;
  readonly label: string;
  readonly isDevExample?: boolean;
}
