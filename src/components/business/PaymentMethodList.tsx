import Image from "next/image";
import type { PaymentMethodBadgeItem } from "@/components/business/types";
import { cn } from "@/lib/utils";

export interface PaymentMethodListProps {
  items?: readonly PaymentMethodBadgeItem[];
  fallbackNames?: readonly string[];
  maxVisible?: number;
  compact?: boolean;
  showDeposit?: boolean;
  className?: string;
}

export function PaymentMethodList({
  items,
  fallbackNames,
  maxVisible,
  compact = false,
  showDeposit = false,
  className,
}: PaymentMethodListProps) {
  const normalized: PaymentMethodBadgeItem[] =
    items && items.length > 0
      ? [...items]
      : (fallbackNames ?? []).map((name) => ({ slug: name, name, logoUrl: null }));

  if (normalized.length === 0) return null;

  const visible = maxVisible ? normalized.slice(0, maxVisible) : normalized;
  const extraCount = normalized.length - visible.length;

  return (
    <ul className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {visible.map((pm) => (
        <li
          key={pm.slug}
          title={
            showDeposit && pm.minDepositDisplay ? `${pm.name} (${pm.minDepositDisplay})` : pm.name
          }
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-subtle/80 font-medium text-fg",
            compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
          )}
        >
          {pm.logoUrl ? (
            <span
              className={cn(
                "flex shrink-0 items-center justify-center overflow-hidden rounded bg-white/95 p-0.5",
                compact ? "h-4 w-5" : "h-5 w-7",
              )}
            >
              <Image
                src={pm.logoUrl}
                alt={pm.name}
                width={compact ? 20 : 28}
                height={compact ? 14 : 18}
                className="h-full w-full object-contain"
              />
            </span>
          ) : null}
          <span>{pm.name}</span>
          {showDeposit && pm.minDepositDisplay ? (
            <span className="text-fg-muted">({pm.minDepositDisplay})</span>
          ) : null}
        </li>
      ))}
      {extraCount > 0 ? (
        <li
          className={cn(
            "inline-flex items-center rounded-full border border-border bg-surface-subtle/60 font-mono text-fg-muted",
            compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
          )}
        >
          +{extraCount}
        </li>
      ) : null}
    </ul>
  );
}
