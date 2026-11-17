"use client";

import {
  Award,
  BarChart3,
  BookOpen,
  Building2,
  ExternalLink,
  Globe2,
  Handshake,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Settings,
  Shapes,
  Sparkles,
  TicketPercent,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { ADMIN_NAV_LINKS } from "./navigation-links";

const ADMIN_ICONS = {
  dashboard: LayoutDashboard,
  catalog: BookOpen,
  bookmakers: Building2,
  offers: Award,
  promoCodes: TicketPercent,
  countries: Globe2,
  predictions: Sparkles,
  contents: Shapes,
  affiliation: Handshake,
  stats: BarChart3,
  users: Users,
  audit: ScrollText,
  settings: Settings,
} as const;

export interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  showDevDesignLink?: boolean;
  onNavigate?: () => void;
  className?: string;
}

const AFFILIATION_PATHS = [
  "/admin/affiliation",
  "/admin/campagnes",
  "/admin/postbacks",
  "/admin/conversions",
  "/admin/commissions",
  "/admin/imports",
];

const AI_PATHS = ["/admin/pronostics", "/admin/ingestion"];
const COMMUNITY_PATHS = ["/admin/communaute", "/admin/contenus", "/admin/notifications"];

function isAdminLinkActive(pathname: string, href: string, key: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  if (key === "affiliation") {
    return AFFILIATION_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  }
  if (key === "predictions") {
    return AI_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  }
  if (key === "contents") {
    return COMMUNITY_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  collapsed = false,
  onToggleCollapse,
  showDevDesignLink = false,
  onNavigate,
  className,
}: SidebarProps) {
  const tAdmin = useTranslations("admin");
  const tBrand = useTranslations("brand");
  const pathname = usePathname();

  return (
    <aside
      aria-label={tAdmin("badge")}
      className={cn(
        "flex h-full flex-col border-r border-border bg-surface-subtle transition-[width] duration-150",
        collapsed ? "w-[4.5rem]" : "w-64",
        className,
      )}
    >
      <div className="flex h-16 items-center justify-between gap-2 border-b border-border px-3">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <span className="sr-only">{tBrand("homeAriaLabel")}</span>
          {collapsed ? <BrandMark variant="badge" size={32} /> : <BrandLogo size="sm" decorative />}
        </Link>
        {onToggleCollapse ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            aria-label={tAdmin("sidebarToggle")}
            aria-expanded={!collapsed}
            className="hidden shrink-0 lg:inline-flex"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2.5">
        {ADMIN_NAV_LINKS.map((item) => {
          const Icon = ADMIN_ICONS[item.key];
          const active = isAdminLinkActive(pathname, item.href, item.key);
          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              title={collapsed ? tAdmin(`nav.${item.key}`) : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent/15 font-semibold text-accent"
                  : "text-fg-muted hover:bg-surface-elevated hover:text-fg",
                collapsed ? "justify-center px-2" : "",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {!collapsed ? <span className="truncate">{tAdmin(`nav.${item.key}`)}</span> : null}
            </Link>
          );
        })}

        <div className="mt-3 border-t border-border pt-3">
          <Link
            href="/offres"
            onClick={onNavigate}
            title={collapsed ? "Site public" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-elevated hover:text-fg",
              collapsed ? "justify-center px-2" : "",
            )}
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {!collapsed ? <span className="truncate">Site public</span> : null}
          </Link>
        </div>

        {showDevDesignLink ? (
          <div className="mt-3 border-t border-border pt-3">
            <Link
              href="/admin/design"
              onClick={onNavigate}
              title={collapsed ? tAdmin("nav.designSystem") : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg border border-accent/30 bg-surface px-3 py-2 text-sm font-semibold text-accent transition-colors hover:bg-surface-elevated",
                collapsed ? "justify-center px-2" : "",
              )}
            >
              <Shapes className="h-4 w-4 shrink-0" aria-hidden="true" />
              {!collapsed ? <span className="truncate">{tAdmin("nav.designSystem")}</span> : null}
            </Link>
          </div>
        ) : null}
      </nav>
    </aside>
  );
}
