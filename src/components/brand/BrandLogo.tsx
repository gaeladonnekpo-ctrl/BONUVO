import { BrandMark } from "./BrandMark";

export type BrandLogoSize = "sm" | "md" | "lg";

export interface BrandLogoProps {
  size?: BrandLogoSize;
  showTagline?: boolean;
  taglineText?: string;
  ariaLabel?: string;
  decorative?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<BrandLogoSize, { word: string; tagline: string }> = {
  sm: {
    word: "text-lg gap-[0.11em]",
    tagline: "text-[9px] tracking-[0.22em]",
  },
  md: {
    word: "text-2xl sm:text-3xl gap-[0.11em]",
    tagline: "text-[10px] tracking-[0.24em]",
  },
  lg: {
    word: "text-4xl sm:text-[54px] gap-[0.113em]",
    tagline: "text-[11px] tracking-[0.24em]",
  },
};

/**
 * Official BONUVO wordmark combining the Unbounded display glyphs and geometric target marks.
 */
export function BrandLogo({
  size = "md",
  showTagline = false,
  taglineText = "SMART OFFERS. BETTER CHOICES.",
  ariaLabel = "BONUVO",
  decorative = false,
  className,
}: BrandLogoProps) {
  const styles = SIZE_CLASSES[size];

  return (
    <div
      aria-hidden={decorative || undefined}
      className={className ? `inline-flex flex-col ${className}` : "inline-flex flex-col"}
    >
      <div
        role={decorative ? undefined : "img"}
        aria-label={decorative ? undefined : ariaLabel}
        className={`inline-flex items-baseline font-display font-bold leading-none text-fg select-none ${styles.word}`}
      >
        {!decorative ? <span className="sr-only">{ariaLabel}</span> : null}
        <span aria-hidden="true">B</span>
        <BrandMark variant="ring" className="h-[0.774em] w-[0.774em] shrink-0" />
        <span aria-hidden="true">NUV</span>
        <BrandMark variant="target" className="h-[0.774em] w-[0.774em] shrink-0" />
      </div>
      {showTagline ? (
        <span className={`mt-2 font-display font-normal text-brand-tagline ${styles.tagline}`}>
          {taglineText}
        </span>
      ) : null}
    </div>
  );
}
