import { CheckCircle2, Flame, ShieldCheck, Sparkles, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { UiBadge } from "@/components/ui/badge";
import type { BusinessBadgeTone } from "./types";

export interface BusinessBadgeProps {
  tone: BusinessBadgeTone;
  label?: string;
  className?: string;
}

const TONE_MAP: Record<BusinessBadgeTone, "accent" | "trust" | "warning" | "neutral"> = {
  recommended: "accent",
  exclusive: "warning",
  new: "neutral",
  verified: "trust",
  warning: "warning",
  neutral: "neutral",
};

/**
 * Semantic business badge. Trust green is reserved strictly for verified/positive status.
 */
export function Badge({ tone, label, className }: BusinessBadgeProps) {
  const t = useTranslations("offerCard");

  const resolvedLabel =
    label ??
    (tone === "recommended"
      ? t("badgeRecommended")
      : tone === "exclusive"
        ? t("badgeExclusive")
        : tone === "new"
          ? t("badgeNew")
          : tone === "verified"
            ? t("badgeVerified")
            : tone);

  const icon =
    tone === "verified" ? (
      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
    ) : tone === "recommended" ? (
      <Star className="h-3.5 w-3.5" aria-hidden="true" />
    ) : tone === "exclusive" ? (
      <Flame className="h-3.5 w-3.5" aria-hidden="true" />
    ) : tone === "new" ? (
      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
    ) : (
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
    );

  return (
    <UiBadge tone={TONE_MAP[tone]} className={className}>
      {icon}
      <span>{resolvedLabel}</span>
    </UiBadge>
  );
}
