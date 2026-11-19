import type { BusinessBadgeTone, PaymentMethodBadgeItem } from "@/components/business/types";
import type { PublicOfferSort } from "@/modules/offers/public-schema";
import type { PublicOfferListItem } from "@/modules/offers/public-types";

const ALLOWED_BADGES = new Set<string>([
  "recommended",
  "exclusive",
  "new",
  "verified",
  "warning",
  "neutral",
]);
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function buildShortCode(name: string): string {
  const letters = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return (letters.slice(0, 3) || "BNV").padEnd(2, "X");
}

const PAYMENT_CATEGORY_PRIORITY: Record<string, number> = {
  mobile_money: 0,
  card: 1,
  bank_transfer: 2,
  voucher: 2,
  e_wallet: 3,
  crypto: 4,
};

export function getPaymentSortPriority(item: { category?: string | null; slug: string }): number {
  if (item.slug === "verve") return 0;
  return PAYMENT_CATEGORY_PRIORITY[item.category ?? ""] ?? 5;
}

export function dedupePaymentItems<
  T extends { slug: string; name: string; category?: string | null; logoUrl?: string | null },
>(rows: readonly T[]): PaymentMethodBadgeItem[] {
  const seen = new Map<string, T>();
  for (const row of rows) {
    if (!seen.has(row.slug)) {
      seen.set(row.slug, row);
    }
  }
  return Array.from(seen.values())
    .sort(
      (a, b) =>
        getPaymentSortPriority(a) - getPaymentSortPriority(b) || a.name.localeCompare(b.name),
    )
    .map((row) => ({
      slug: row.slug,
      name: row.name,
      logoUrl: row.logoUrl ?? null,
    }));
}

export function formatAmountDisplay(params: {
  bonusAmount: string | number | null;
  bonusPercentage: number | null;
  currencyCode: string;
  locale: "fr" | "en";
}): string {
  const numeric = params.bonusAmount === null ? null : Number(params.bonusAmount);
  if (numeric !== null && Number.isFinite(numeric) && numeric > 0) {
    const formatted = new Intl.NumberFormat(params.locale === "en" ? "en-US" : "fr-FR", {
      maximumFractionDigits: Number.isInteger(numeric) ? 0 : 2,
    }).format(numeric);
    if (params.bonusPercentage && params.bonusPercentage > 0) {
      return `${params.bonusPercentage}% · ${formatted} ${params.currencyCode}`;
    }
    return `${formatted} ${params.currencyCode}`;
  }
  if (params.bonusPercentage && params.bonusPercentage > 0) {
    return `${params.bonusPercentage}%`;
  }
  return params.currencyCode;
}

export function resolveOfferBadges(params: {
  badgeCode: string | null;
  badgeJustification?: string | null;
  isSharedPromoCode?: boolean;
  createdAt: Date;
  lastVerifiedAt: Date | null;
  now?: Date;
}): BusinessBadgeTone[] {
  const badges: BusinessBadgeTone[] = [];
  const nowMs = (params.now ?? new Date()).getTime();
  const hasJustification =
    params.badgeJustification === undefined || params.badgeJustification?.trim().length !== 0;

  if (params.badgeCode && ALLOWED_BADGES.has(params.badgeCode) && hasJustification) {
    if (params.badgeCode === "exclusive" && params.isSharedPromoCode) {
      // Never show "Exclusif" when the same promo code is shared across multiple operators
    } else if (params.badgeCode === "new") {
      if (nowMs - params.createdAt.getTime() <= THIRTY_DAYS_MS) {
        badges.push("new");
      }
    } else {
      badges.push(params.badgeCode as BusinessBadgeTone);
    }
  }

  if (params.lastVerifiedAt && isSameUtcDay(params.lastVerifiedAt, params.now ?? new Date())) {
    if (!badges.includes("verified")) {
      badges.push("verified");
    }
  }

  return badges;
}

export function isSameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export function formatVerifiedLabel(date: Date | null, locale: "fr" | "en"): string | undefined {
  if (!date) return undefined;
  if (isSameUtcDay(date, new Date())) {
    return locale === "en" ? "Today" : "Aujourd'hui";
  }
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function sortPublicOffers(
  items: PublicOfferListItem[],
  sort: PublicOfferSort,
): PublicOfferListItem[] {
  const copy = [...items];
  copy.sort((a, b) => {
    if (sort === "rating") {
      const scoreDiff = (b.ratingScore ?? -1) - (a.ratingScore ?? -1);
      if (scoreDiff !== 0) return scoreDiff;
      return a.effectiveRank - b.effectiveRank;
    }
    if (sort === "bonus") {
      const bonusDiff = (b.bonusAmountNumber ?? -1) - (a.bonusAmountNumber ?? -1);
      if (bonusDiff !== 0) return bonusDiff;
      return a.effectiveRank - b.effectiveRank;
    }
    if (sort === "recent") {
      const timeA = Date.parse(a.lastVerifiedIso ?? a.updatedAtIso);
      const timeB = Date.parse(b.lastVerifiedIso ?? b.updatedAtIso);
      if (timeB !== timeA) return timeB - timeA;
      return a.effectiveRank - b.effectiveRank;
    }
    // Default "rank": country rankOverride / offer rankOrder -> rating DESC -> verified date DESC
    if (a.effectiveRank !== b.effectiveRank) return a.effectiveRank - b.effectiveRank;
    const scoreDiff = (b.ratingScore ?? -1) - (a.ratingScore ?? -1);
    if (scoreDiff !== 0) return scoreDiff;
    return (
      Date.parse(b.lastVerifiedIso ?? b.updatedAtIso) -
      Date.parse(a.lastVerifiedIso ?? a.updatedAtIso)
    );
  });
  return copy;
}

export function filterAndRankOffers(
  items: PublicOfferListItem[],
  filter: {
    type?: string;
    bookmaker?: string;
    paiement?: string;
    avecCode?: boolean;
    depotMax?: number | null;
    q?: string;
    tri?: PublicOfferSort;
  },
): PublicOfferListItem[] {
  const filtered = items.filter((item) => {
    if (filter.type && filter.type !== "all" && item.offerType !== filter.type) return false;
    if (filter.bookmaker && item.bookmakerSlug !== filter.bookmaker) return false;
    if (filter.paiement && !item.paymentMethodSlugs.includes(filter.paiement)) return false;
    if (filter.avecCode && !item.promoCode) return false;
    if (
      filter.depotMax !== undefined &&
      filter.depotMax !== null &&
      (item.minDepositNumber === null || item.minDepositNumber > filter.depotMax)
    ) {
      return false;
    }
    if (filter.q && filter.q.trim().length > 0) {
      const needle = filter.q.trim().toLowerCase();
      const hay =
        `${item.bookmakerName} ${item.bonusHeadline} ${item.promoCode ?? ""}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });

  return sortPublicOffers(filtered, filter.tri ?? "rank").map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));
}

/**
 * Formats a per-country license only when both a local authorization number and authority exist.
 */
export function formatLocalCountryLicense(
  localLicense: string | null | undefined,
  authorityName: string | null | undefined,
): string | null {
  const num = localLicense?.trim() ?? "";
  const auth = authorityName?.trim() ?? "";
  if (!num || !auth) return null;
  return `${num} · ${auth}`;
}

/**
 * Resolves the display summary preferring a verified local license, else the single operator license.
 */
export function resolveBookmakerLicenseSummary(params: {
  localLicense?: string | null;
  authorityName?: string | null;
  operatorLicenseNumber?: string | null;
  operatorLicenseAuthority?: string | null;
}): string | null {
  const local = formatLocalCountryLicense(params.localLicense, params.authorityName);
  if (local) return local;
  const opNum = params.operatorLicenseNumber?.trim() ?? "";
  const opAuth = params.operatorLicenseAuthority?.trim() ?? "";
  return opNum || opAuth || null;
}
