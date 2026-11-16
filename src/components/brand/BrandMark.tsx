import type { SVGProps } from "react";

export interface BrandMarkProps extends SVGProps<SVGSVGElement> {
  variant?: "target" | "ring" | "badge";
  size?: number;
}

/**
 * Geometric BONUVO bullseye / ring mark derived from the approved brand artboard.
 */
export function BrandMark({ variant = "target", size = 24, className, ...props }: BrandMarkProps) {
  if (variant === "badge") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden={props["aria-label"] ? undefined : true}
        className={className}
        {...props}
      >
        <rect width="64" height="64" rx="14" fill="var(--brand-target)" />
        <g transform="translate(8 8)">
          <circle cx="24" cy="24" r="19" fill="none" stroke="var(--accent-fg)" strokeWidth="10" />
          <circle cx="24" cy="24" r="7" fill="var(--accent-fg)" />
        </g>
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden={props["aria-label"] ? undefined : true}
      className={className}
      {...props}
    >
      <circle
        cx="24"
        cy="24"
        r="19"
        fill="none"
        stroke={variant === "ring" ? "currentColor" : "var(--brand-target)"}
        strokeWidth="10"
      />
      {variant === "target" ? <circle cx="24" cy="24" r="7" fill="var(--brand-target)" /> : null}
    </svg>
  );
}
