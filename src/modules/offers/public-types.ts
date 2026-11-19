import type { BusinessBadgeTone, OfferCardData } from "@/components/business/types";
import type { OfferType } from "@/server/db/schema/offers";

export interface PublicCountrySummary {
  readonly code: string;
  readonly nameFr: string;
  readonly nameEn: string;
  readonly currencyCode: string;
  readonly defaultLocale: "fr" | "en";
}

export interface PublicPaymentMethodSummary {
  readonly slug: string;
  readonly name: string;
  readonly category: string;
  readonly logoUrl?: string | null;
  readonly minDepositDisplay?: string | null;
  readonly supportsDeposit?: boolean;
  readonly supportsWithdrawal?: boolean;
}

export interface PublicOfferListItem extends OfferCardData {
  readonly offerSlug: string;
  readonly offerType: OfferType;
  readonly bookmakerId: string;
  readonly bookmakerSlug: string;
  readonly bookmakerLogoUrl: string | null;
  readonly promoCodeId: string | null;
  readonly bonusAmountNumber: number | null;
  readonly bonusPercentage: number | null;
  readonly minDepositNumber: number | null;
  readonly minOddsNumber: number | null;
  readonly currencyCode: string;
  readonly lastVerifiedIso: string | null;
  readonly updatedAtIso: string;
  readonly effectiveRank: number;
  readonly eligibleCountryCodes: readonly string[];
  readonly paymentMethodSlugs: readonly string[];
}

export interface PublicOfferTermItem {
  readonly id: string;
  readonly title: string;
  readonly body: string;
}

export interface PublicOfferDetailData {
  readonly eligibleInCountry: boolean;
  readonly requestedCountryCode: string;
  readonly offer: PublicOfferListItem;
  readonly terms: readonly PublicOfferTermItem[];
  readonly positiveHighlights: readonly string[];
  readonly negativeHighlights: readonly string[];
  readonly eligibleCountries: readonly PublicCountrySummary[];
  readonly neighboringOffers: readonly PublicOfferListItem[];
}

export interface PublicBookmakerRatingBreakdown {
  readonly gridVersion: string;
  readonly bonusScore: number;
  readonly paymentsScore: number;
  readonly oddsScore: number;
  readonly appScore: number;
  readonly supportScore: number;
  readonly finalScore: number;
  readonly notes: string;
}

export interface PublicBookmakerCountryLicense {
  readonly countryCode: string;
  readonly countryNameFr: string;
  readonly countryNameEn: string;
  readonly localLicense: string;
  readonly authorityName: string;
  readonly countryScore: number | null;
}

export interface PublicBookmakerListItem {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly shortCode: string;
  readonly logoUrl: string | null;
  readonly foundedYear: number | null;
  readonly appPlatforms: readonly string[];
  readonly finalScore: number | null;
  readonly activeOffersCount: number;
  readonly activePromoCount: number;
  readonly primaryOfferSlug?: string | null;
  readonly licenseSummary: string | null;
  readonly operatorLicenseNumber?: string | null;
  readonly operatorLicenseAuthority?: string | null;
  readonly paymentMethods: readonly PublicPaymentMethodSummary[];
}

export interface PublicBookmakerDetailData {
  readonly eligibleInCountry: boolean;
  readonly requestedCountryCode: string;
  readonly bookmaker: PublicBookmakerListItem & {
    readonly description: string;
  };
  readonly rating: PublicBookmakerRatingBreakdown | null;
  readonly countryLicenses: readonly PublicBookmakerCountryLicense[];
  readonly paymentMethods: readonly PublicPaymentMethodSummary[];
  readonly activeOffers: readonly PublicOfferListItem[];
  readonly activePromoCodes: readonly PublicPromoCodeItem[];
}

export interface PublicPromoCodeItem {
  readonly id: string;
  readonly code: string;
  readonly description: string;
  readonly bookmakerId: string;
  readonly bookmakerName: string;
  readonly bookmakerSlug: string;
  readonly bookmakerShortCode: string;
  readonly bookmakerLogoUrl: string | null;
  readonly offerId: string | null;
  readonly offerSlug: string | null;
  readonly offerTitle: string | null;
  readonly countryCode: string | null;
  readonly ctaHref: string | null;
  readonly validUntilIso: string | null;
}

export interface PublicCatalogMeta {
  readonly countryCode: string;
  readonly currencyCode: string;
  readonly isCountryCovered: boolean;
  readonly activeCountries: readonly PublicCountrySummary[];
  readonly paymentMethods: readonly PublicPaymentMethodSummary[];
}

export type { BusinessBadgeTone };
