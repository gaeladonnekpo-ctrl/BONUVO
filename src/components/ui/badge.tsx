import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

export const uiBadgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-tight transition-colors",
  {
    variants: {
      tone: {
        neutral: "border-border bg-surface-elevated text-fg",
        accent: "border-accent/40 bg-accent text-accent-fg",
        trust: "border-trust/40 bg-trust-soft text-trust",
        warning: "border-warning/40 bg-warning-soft text-warning",
        danger: "border-danger/40 bg-danger-soft text-danger",
        outline: "border-border-strong bg-transparent text-fg-muted",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

export interface UiBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof uiBadgeVariants> {}

export function UiBadge({ className, tone, ...props }: UiBadgeProps) {
  return <span className={cn(uiBadgeVariants({ tone }), className)} {...props} />;
}
