import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  readonly label: string;
  readonly href?: string;
}

export interface BreadcrumbProps {
  items: readonly BreadcrumbItem[];
  ariaLabel?: string;
  className?: string;
}

export function Breadcrumb({ items, ariaLabel = "Breadcrumb", className }: BreadcrumbProps) {
  return (
    <nav
      aria-label={ariaLabel}
      className={cn("flex flex-wrap items-center gap-1.5 text-xs text-fg-muted", className)}
    >
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5">
              {item.href && !isLast ? (
                <Link href={item.href} className="hover:text-fg hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={isLast ? "font-semibold text-fg" : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast ? (
                <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
